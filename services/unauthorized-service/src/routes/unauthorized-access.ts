import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/unauthorized-access - Create new unauthorized access alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      trackId,
      siteId,
      cameraId,
      cameraName,
      location,
      detectionTimestamp,
      durationSeconds,
      totalFramesTracked,
      faceDetectionAttempts,
      snapshotUrl,
      bbox,
      status = 'active',
      severity = 'high',
    } = req.body;

    // Validate required fields
    if (trackId === undefined || trackId === null) {
      return res.status(400).json({
        success: false,
        message: 'trackId is required',
      });
    }

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required',
      });
    }

    if (!cameraName || !location) {
      return res.status(400).json({
        success: false,
        message: 'cameraName and location are required',
      });
    }

    // Parse detection timestamp
    const timestamp = detectionTimestamp
      ? new Date(detectionTimestamp)
      : new Date();

    if (isNaN(timestamp.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid detectionTimestamp format',
      });
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Create unauthorized access record
    const unauthorizedAccess = await prisma.unauthorizedAccess.create({
      data: {
        trackId,
        siteId,
        cameraId: cameraId || null,
        cameraName,
        location,
        detectionTimestamp: timestamp,
        durationSeconds: durationSeconds || 0,
        totalFramesTracked: totalFramesTracked || 0,
        faceDetectionAttempts: faceDetectionAttempts || 0,
        snapshotUrl: snapshotUrl || null,
        bbox: bbox || null,
        status,
        severity,
      },
    });

    console.log(
      `✅ Unauthorized access alert created: Track-${trackId} at ${cameraName}`
    );

    return res.status(201).json({
      success: true,
      message: 'Unauthorized access alert created successfully',
      alert: {
        id: unauthorizedAccess.id,
        trackId: unauthorizedAccess.trackId,
        location: unauthorizedAccess.location,
        timestamp: unauthorizedAccess.detectionTimestamp,
        severity: unauthorizedAccess.severity,
      },
    });
  } catch (error) {
    console.error('Unauthorized access creation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create unauthorized access alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/unauthorized-access - Get unauthorized access alerts with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      siteId,
      cameraId,
      status = 'active',
      severity,
      startDate,
      endDate,
      limit = '100',
      skip = '0',
    } = req.query;

    // Build where clause
    const where: any = {};

    if (siteId) where.siteId = siteId as string;
    if (cameraId) where.cameraId = cameraId as string;
    if (status !== 'all') where.status = status as string;
    if (severity) where.severity = severity as string;

    if (startDate || endDate) {
      where.detectionTimestamp = {};
      if (startDate) {
        where.detectionTimestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.detectionTimestamp.lte = new Date(endDate as string);
      }
    }

    // Fetch unauthorized access records
    const [alerts, total] = await Promise.all([
      prisma.unauthorizedAccess.findMany({
        where,
        orderBy: { detectionTimestamp: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(skip as string),
        include: {
          site: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          camera: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          identifiedPersonnel: {
            select: {
              id: true,
              name: true,
              employeeId: true,
            },
          },
        },
      }),
      prisma.unauthorizedAccess.count({ where }),
    ]);

    return res.json({
      success: true,
      alerts,
      pagination: {
        total,
        limit: parseInt(limit as string),
        skip: parseInt(skip as string),
        hasMore: parseInt(skip as string) + parseInt(limit as string) < total,
      },
    });
  } catch (error) {
    console.error('Error fetching unauthorized access alerts:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unauthorized access alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/unauthorized-access/:id - Update unauthorized access alert
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      resolvedBy,
      resolutionNotes,
      identifiedPersonName,
      identifiedPersonnelId,
      severity,
    } = req.body;

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (resolvedBy) updateData.resolvedBy = resolvedBy;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (identifiedPersonName)
      updateData.identifiedPersonName = identifiedPersonName;
    if (identifiedPersonnelId)
      updateData.identifiedPersonnelId = identifiedPersonnelId;
    if (severity) updateData.severity = severity;

    // If status is being set to resolved, add timestamp
    if (status === 'resolved' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const updatedAlert = await prisma.unauthorizedAccess.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        camera: {
          select: {
            id: true,
            name: true,
          },
        },
        identifiedPersonnel: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Unauthorized access alert updated successfully',
      alert: updatedAlert,
    });
  } catch (error) {
    console.error('Error updating unauthorized access alert:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update unauthorized access alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/unauthorized-access/:id - Delete unauthorized access alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.unauthorizedAccess.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Unauthorized access alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting unauthorized access alert:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete unauthorized access alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
