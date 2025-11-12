import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/ppe-violations - Create new PPE violation
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      personName,
      personnelId,
      confidenceScore,
      siteId,
      cameraId,
      cameraName,
      location,
      previousState,
      currentState,
      ppeWearing,
      ppeMissing,
      ppeRequired,
      violationReason,
      severity,
      detectionTimestamp,
      snapshotUrl,
      snapshotMetadata,
    } = req.body;

    // Validate required fields
    if (
      !personName ||
      !siteId ||
      !cameraName ||
      !previousState ||
      !currentState ||
      !ppeWearing ||
      !ppeMissing ||
      !ppeRequired ||
      !violationReason
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: personName, siteId, cameraName, previousState, currentState, ppeWearing, ppeMissing, ppeRequired, violationReason',
      });
    }

    // Validate arrays
    if (
      !Array.isArray(ppeWearing) ||
      !Array.isArray(ppeMissing) ||
      !Array.isArray(ppeRequired)
    ) {
      return res.status(400).json({
        success: false,
        message: 'ppeWearing, ppeMissing, and ppeRequired must be arrays',
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

    // Determine severity based on missing PPE if not provided
    let violationSeverity = severity || 'medium';
    if (!severity) {
      if (ppeMissing.length === 0) {
        violationSeverity = 'low'; // Compliance restored
      } else if (ppeMissing.includes('Hard_hat')) {
        violationSeverity = 'high'; // Hard hat is critical
      } else if (ppeMissing.length >= 2) {
        violationSeverity = 'high'; // Multiple items missing
      } else {
        violationSeverity = 'medium';
      }
    }

    // Try to find matching personnel by name if not provided
    let resolvedPersonnelId = personnelId;
    if (!resolvedPersonnelId && personName) {
      const personnel = await prisma.personnel.findFirst({
        where: {
          name: personName,
          siteId: siteId,
        },
      });
      if (personnel) {
        resolvedPersonnelId = personnel.id;
      }
    }

    // Create PPE violation record
    const ppeViolation = await prisma.pPEViolation.create({
      data: {
        personName,
        personnelId: resolvedPersonnelId,
        confidenceScore: confidenceScore || null,
        siteId,
        cameraId: cameraId || null,
        cameraName,
        location: location || null,
        previousState,
        currentState,
        ppeWearing,
        ppeMissing,
        ppeRequired,
        violationReason,
        severity: violationSeverity,
        status: 'active',
        detectionTimestamp: timestamp,
        snapshotUrl: snapshotUrl || null,
        snapshotMetadata: snapshotMetadata || null,
      },
    });

    return res.json({
      success: true,
      violation: ppeViolation,
    });
  } catch (error) {
    console.error('PPE violation creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create PPE violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/ppe-violations - Retrieve PPE violations with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      siteId,
      personnelId,
      personName,
      status,
      severity,
      startDate,
      endDate,
      limit = '100',
    } = req.query;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required',
      });
    }

    // Build query filters
    const where: any = { siteId: siteId as string };

    if (personnelId) {
      where.personnelId = personnelId as string;
    }

    if (personName) {
      where.personName = {
        contains: personName as string,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status as string;
    }

    if (severity) {
      where.severity = severity as string;
    }

    if (startDate || endDate) {
      where.detectionTimestamp = {};
      if (startDate) {
        where.detectionTimestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.detectionTimestamp.lte = new Date(endDate as string);
      }
    }

    const violations = await prisma.pPEViolation.findMany({
      where,
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { detectionTimestamp: 'desc' },
      take: parseInt(limit as string),
    });

    return res.json({
      success: true,
      count: violations.length,
      violations,
    });
  } catch (error) {
    console.error('PPE violation retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve PPE violations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/ppe-violations/:id/resolve - Resolve a PPE violation
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    const violation = await prisma.pPEViolation.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes,
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
    console.error('PPE violation resolution error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve PPE violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/ppe-violations/:id/acknowledge - Acknowledge a PPE violation
router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const violation = await prisma.pPEViolation.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy,
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
    console.error('PPE violation acknowledgment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge PPE violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
