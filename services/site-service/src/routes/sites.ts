import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const router = Router();
const prisma = new PrismaClient();

// POST /api/sites - Create new site
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, location, code, description } = req.body;

    if (!name || !location || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, location, code',
      });
    }

    // Check if code already exists
    const existing = await prisma.site.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Site code already exists',
      });
    }

    const site = await prisma.site.create({
      data: {
        name,
        location,
        code,
        description,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      site,
    });
  } catch (error) {
    console.error('Site creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create site',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/sites - Get all sites
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const sites = await prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            personnel: true,
            cameras: true,
            violations: true,
            ppeViolations: true,
            unauthorizedAccess: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      count: sites.length,
      sites,
    });
  } catch (error) {
    console.error('Site retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sites',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/sites/code/:code - Get site by code
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const site = await prisma.site.findUnique({
      where: { code },
      include: {
        cameras: true,
        personnel: {
          where: { isAuthorized: true },
        },
        _count: {
          select: {
            personnel: true,
            cameras: true,
            violations: true,
            ppeViolations: true,
            unauthorizedAccess: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    return res.json({
      success: true,
      site,
    });
  } catch (error) {
    console.error('Site retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve site',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/sites/:id - Get single site
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        cameras: true,
        personnel: {
          where: { isAuthorized: true },
        },
        _count: {
          select: {
            personnel: true,
            cameras: true,
            violations: true,
            ppeViolations: true,
            unauthorizedAccess: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    return res.json({
      success: true,
      site,
    });
  } catch (error) {
    console.error('Site retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve site',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/sites/:id - Update site
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, location, description, isActive } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      site,
    });
  } catch (error) {
    console.error('Site update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update site',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/sites/:id/qr - Generate QR code
router.post('/:id/qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Generate QR code data URL
    const qrData = JSON.stringify({
      siteId: site.id,
      siteCode: site.code,
      siteName: site.name,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    // Update site with QR code
    const updatedSite = await prisma.site.update({
      where: { id },
      data: {
        qrCode: qrCodeDataUrl,
      },
    });

    return res.json({
      success: true,
      site: updatedSite,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/sites/:id - Delete site
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if site has dependencies
    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            personnel: true,
            cameras: true,
            violations: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    const totalDependencies =
      site._count.personnel + site._count.cameras + site._count.violations;

    if (totalDependencies > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete site with existing personnel (${site._count.personnel}), cameras (${site._count.cameras}), or violations (${site._count.violations})`,
      });
    }

    await prisma.site.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Site deleted successfully',
    });
  } catch (error) {
    console.error('Site deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete site',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
