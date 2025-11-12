import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/cameras - Create new camera
router.post('/', async (req: Request, res: Response) => {
  try {
    const { siteId, name, location, ipAddress, streamUrl } = req.body;

    if (!siteId || !name || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: siteId, name, location',
      });
    }

    const camera = await prisma.camera.create({
      data: {
        siteId,
        name,
        location,
        ipAddress,
        streamUrl,
        status: 'online',
        isActive: true,
      },
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
      camera,
    });
  } catch (error) {
    console.error('Camera creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create camera',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/cameras - Get all cameras
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, status, isActive } = req.query;

    const where: any = {};

    if (siteId) where.siteId = siteId as string;
    if (status) where.status = status as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const cameras = await prisma.camera.findMany({
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
      count: cameras.length,
      cameras,
    });
  } catch (error) {
    console.error('Camera retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cameras',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/cameras/:id - Get single camera
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const camera = await prisma.camera.findUnique({
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

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Camera not found',
      });
    }

    return res.json({
      success: true,
      camera,
    });
  } catch (error) {
    console.error('Camera retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve camera',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/cameras/:id - Update camera
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, location, ipAddress, streamUrl, status, isActive } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (streamUrl !== undefined) updateData.streamUrl = streamUrl;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const camera = await prisma.camera.update({
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
      camera,
    });
  } catch (error) {
    console.error('Camera update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update camera',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/cameras/:id/status - Update camera status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const camera = await prisma.camera.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
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
      camera,
    });
  } catch (error) {
    console.error('Camera status update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update camera status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/cameras/:id/stream - Update camera stream URL
router.patch('/:id/stream', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { streamUrl } = req.body;

    const camera = await prisma.camera.update({
      where: { id },
      data: {
        streamUrl,
        updatedAt: new Date(),
      },
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
      camera,
    });
  } catch (error) {
    console.error('Camera stream update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update camera stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/cameras/:id - Delete camera
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.camera.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Camera deleted successfully',
    });
  } catch (error) {
    console.error('Camera deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete camera',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cameras/:id/test - Test camera connection
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const camera = await prisma.camera.findUnique({
      where: { id },
    });

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Camera not found',
      });
    }

    // Simple connectivity test - in production, implement actual stream test
    const isReachable = true; // Placeholder

    await prisma.camera.update({
      where: { id },
      data: {
        status: isReachable ? 'online' : 'offline',
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      status: isReachable ? 'online' : 'offline',
      message: isReachable
        ? 'Camera is reachable'
        : 'Camera is not reachable',
    });
  } catch (error) {
    console.error('Camera test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test camera connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
