import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { S3Service } from '../lib/s3';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Helper function to call Flask add_faces endpoint
async function addFacesToFlask(
  personnelId: string,
  name: string,
  photoFiles: Express.Multer.File[]
): Promise<{ added: number; failed: number; results: any[]; errors: any[] }> {
  try {
    const formData = new FormData();

    // Add each photo file
    photoFiles.forEach((file) => {
      formData.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    // Add person metadata
    formData.append('name', name);
    formData.append('personnelId', personnelId);

    const flaskUrl = process.env.FLASK_API_URL || 'https://aeye001.biofuel.osiris.sg';
    const response = await fetch(`${flaskUrl}/api/add_faces`, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok && response.status !== 207) {
      const errorData = await response.json();
      console.error('Flask add_faces error:', errorData);
      return {
        added: 0,
        failed: photoFiles.length,
        results: [],
        errors: [errorData],
      };
    }

    const result = await response.json();
    console.log(
      `Flask add_faces: ${result.added} added, ${result.failed} failed`
    );
    return result;
  } catch (error) {
    console.error('Error calling Flask add_faces endpoint:', error);
    return {
      added: 0,
      failed: photoFiles.length,
      results: [],
      errors: [{ error: String(error) }],
    };
  }
}

// POST /api/personnel - Create new personnel with photos
router.post('/', upload.array('photos', 10), async (req: Request, res: Response) => {
  try {
    const { siteSlug, name, role, department, position, employeeId } = req.body;
    const photoFiles = req.files as Express.Multer.File[];

    if (!siteSlug || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: siteSlug, name, role',
      });
    }

    // Get site by code
    const site = await prisma.site.findUnique({
      where: { code: siteSlug },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Create personnel record first to get ID
    const newPersonnel = await prisma.personnel.create({
      data: {
        siteId: site.id,
        name,
        role,
        department,
        position,
        employeeId,
        status: 'pending',
        isAuthorized: false,
        requestDate: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

    // Handle multiple photos upload to S3
    let photoUrls: string[] = [];
    if (photoFiles && photoFiles.length > 0) {
      try {
        // Upload all photos to S3
        photoUrls = await S3Service.uploadMultiplePersonnelPhotos(
          photoFiles,
          newPersonnel.id
        );

        // Update personnel record with photos array
        await prisma.personnel.update({
          where: { id: newPersonnel.id },
          data: {
            photos: photoUrls,
          },
        });

        console.log(
          `${photoUrls.length} photos uploaded to S3 for personnel ${newPersonnel.id}`
        );

        // Call Flask add_faces endpoint with all photos at once
        const flaskResult = await addFacesToFlask(
          newPersonnel.id,
          name,
          photoFiles
        );

        console.log(
          `Flask face recognition: ${flaskResult.added}/${photoFiles.length} photos successfully added`
        );

        if (flaskResult.errors.length > 0) {
          console.warn('Flask face recognition errors:', flaskResult.errors);
        }
      } catch (photoError) {
        console.error('Error uploading photos to S3:', photoError);
        // Don't fail the entire request if photo upload fails
      }
    }

    // Return the updated personnel record
    const updatedPersonnel = await prisma.personnel.findUnique({
      where: { id: newPersonnel.id },
    });

    return res.json({
      success: true,
      personnel: updatedPersonnel,
    });
  } catch (error) {
    console.error('Failed to create personnel record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create personnel record',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/personnel - Get all personnel for a site
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, status, isAuthorized } = req.query;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required',
      });
    }

    const where: any = { siteId: siteId as string };

    if (status) {
      where.status = status as string;
    }

    if (isAuthorized !== undefined) {
      where.isAuthorized = isAuthorized === 'true';
    }

    const personnel = await prisma.personnel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      count: personnel.length,
      personnel,
    });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personnel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/personnel/:id - Get single personnel
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const personnel = await prisma.personnel.findUnique({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Personnel not found',
      });
    }

    return res.json({
      success: true,
      personnel,
    });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personnel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/personnel/:id - Update personnel
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      role,
      position,
      department,
      employeeId,
      accessLevel,
      status,
      isAuthorized,
      authorizedBy,
    } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (position !== undefined) updateData.position = position;
    if (department !== undefined) updateData.department = department;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
    if (status !== undefined) updateData.status = status;
    if (isAuthorized !== undefined) {
      updateData.isAuthorized = isAuthorized;
      if (isAuthorized) {
        updateData.authorizedAt = new Date();
        if (authorizedBy) updateData.authorizedBy = authorizedBy;
      }
    }

    const updatedPersonnel = await prisma.personnel.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      personnel: updatedPersonnel,
    });
  } catch (error) {
    console.error('Error updating personnel:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update personnel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/personnel/:id/photos - Upload additional photos
router.post('/:id/photos', upload.array('photos', 10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const photoFiles = req.files as Express.Multer.File[];

    if (!photoFiles || photoFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos provided',
      });
    }

    const personnel = await prisma.personnel.findUnique({
      where: { id },
    });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Personnel not found',
      });
    }

    // Upload new photos to S3
    const newPhotoUrls = await S3Service.uploadMultiplePersonnelPhotos(
      photoFiles,
      id
    );

    // Merge with existing photos
    const existingPhotos = (personnel.photos as string[]) || [];
    const allPhotos = [...existingPhotos, ...newPhotoUrls];

    // Update personnel record
    const updatedPersonnel = await prisma.personnel.update({
      where: { id },
      data: {
        photos: allPhotos,
      },
    });

    // Add faces to Flask API
    const flaskResult = await addFacesToFlask(
      id,
      personnel.name,
      photoFiles
    );

    return res.json({
      success: true,
      personnel: updatedPersonnel,
      uploadedCount: newPhotoUrls.length,
      flaskResult,
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload photos',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/personnel/:id - Delete personnel
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get personnel to access photos and info
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Personnel not found',
      });
    }

    // Delete face from Flask face recognition API
    try {
      const flaskUrl = process.env.FLASK_API_URL || 'https://aeye001.biofuel.osiris.sg';
      const response = await fetch(`${flaskUrl}/api/delete_face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personnelId: id,
          name: personnel.name,
        }),
      });

      if (response.ok) {
        console.log(`Successfully deleted face from Flask API for personnel ${id}`);
      } else {
        const errorText = await response.text();
        console.error(`Flask API delete_face failed: ${response.status} - ${errorText}`);
      }
    } catch (flaskError) {
      console.error('Error calling Flask API delete_face:', flaskError);
      // Continue with deletion even if Flask API fails
    }

    // Delete all photos from S3
    if (personnel.photos && Array.isArray(personnel.photos) && personnel.photos.length > 0) {
      try {
        const photoUrls = personnel.photos.filter((p): p is string => typeof p === 'string');
        await S3Service.deleteMultipleFiles(photoUrls);
        console.log(`Deleted ${photoUrls.length} photos from S3`);
      } catch (s3Error) {
        console.error('Error deleting photos from S3:', s3Error);
        // Continue with deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.personnel.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Personnel deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting personnel:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete personnel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
