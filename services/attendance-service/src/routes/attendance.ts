import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/attendance - Mark attendance
router.post('/', async (req: Request, res: Response) => {
  try {
    const { siteId, personnelId, cameraId, confidence, timestamp } = req.body;

    if (!siteId || !personnelId || !cameraId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: siteId, personnelId, cameraId',
      });
    }

    const confidenceScore = confidence !== undefined ? parseFloat(confidence) : 0.0;
    if (isNaN(confidenceScore)) {
      return res.status(400).json({
        success: false,
        message: 'Confidence must be a valid number',
      });
    }

    const now = timestamp ? new Date(timestamp) : new Date();

    // Check if already marked within last 30 seconds
    const recentAttendance = await prisma.attendance.findFirst({
      where: {
        siteId,
        personnelId,
        timestamp: {
          gte: new Date(now.getTime() - 30000),
        },
      },
    });

    if (recentAttendance) {
      return res.json({
        success: true,
        attendance: recentAttendance,
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        siteId,
        personnelId,
        cameraId,
        confidence: confidenceScore,
        timestamp: now,
      },
      include: {
        personnel: true,
        camera: true,
        site: true,
      },
    });

    return res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error('Attendance marking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/attendance - Get attendance records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, personnelId, date, limit = '50' } = req.query;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required',
      });
    }

    const where: any = { siteId: siteId as string };

    if (personnelId) {
      where.personnelId = personnelId as string;
    }

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where,
      include: {
        personnel: true,
        camera: true,
        site: true,
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    return res.json({
      success: true,
      count: attendanceRecords.length,
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error('Attendance retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
