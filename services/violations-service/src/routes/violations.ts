import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/violations - Create new violation
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      description,
      severity = 'medium',
      status = 'active',
      location,
      siteId,
      cameraId,
      personnelId,
      imageUrl,
    } = req.body;

    // Validate required fields
    if (!type || !description || !siteId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, description, siteId',
      });
    }

    const violation = await prisma.violation.create({
      data: {
        type,
        description,
        severity,
        status,
        location,
        siteId,
        cameraId,
        personnelId,
        imageUrl,
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
    });

    return res.json({
      success: true,
      violation,
    });
  } catch (error) {
    console.error('Violation creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/violations - Get violations with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      siteId,
      status,
      severity,
      type,
      personnelId,
      cameraId,
      limit = '100',
      skip = '0',
    } = req.query;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required',
      });
    }

    const where: any = { siteId: siteId as string };

    if (status) where.status = status as string;
    if (severity) where.severity = severity as string;
    if (type) where.type = type as string;
    if (personnelId) where.personnelId = personnelId as string;
    if (cameraId) where.cameraId = cameraId as string;

    const violations = await prisma.violation.findMany({
      where,
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(skip as string),
    });

    const total = await prisma.violation.count({ where });

    return res.json({
      success: true,
      count: violations.length,
      total,
      violations,
    });
  } catch (error) {
    console.error('Violation retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve violations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/violations/:id - Get single violation
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const violation = await prisma.violation.findUnique({
      where: { id },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
    });

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Violation not found',
      });
    }

    return res.json({
      success: true,
      violation,
    });
  } catch (error) {
    console.error('Violation retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/violations/:id/resolve - Resolve a violation
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvedBy } = req.body;

    const violation = await prisma.violation.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
    });

    return res.json({
      success: true,
      violation,
    });
  } catch (error) {
    console.error('Violation resolution error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/violations/:id - Delete a violation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.violation.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Violation deleted successfully',
    });
  } catch (error) {
    console.error('Violation deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
