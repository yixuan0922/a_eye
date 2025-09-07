import { db } from "./db";
import type {
  Site,
  Personnel,
  Camera,
  Violation,
  Incident,
  Activity,
} from "@prisma/client";
import QRCode from "qrcode";
import { S3Service } from "./s3";

export class Storage {
  // Sites
  async getSite(id: string): Promise<Site | null> {
    return await db.site.findUnique({
      where: { id },
      include: {
        cameras: true,
        personnel: true,
        violations: true,
      },
    });
  }

  async getSiteBySlug(slug: string): Promise<Site | null> {
    return await db.site.findUnique({
      where: { slug },
      include: {
        cameras: true,
        personnel: true,
        violations: true,
      },
    });
  }

  async getSiteByCode(code: string): Promise<Site | null> {
    return await db.site.findUnique({
      where: { code },
      include: {
        cameras: true,
        personnel: true,
        violations: true,
        users: true,
      },
    });
  }

  async createSite(data: {
    name: string;
    slug: string;
    adminUsername: string;
    adminPassword: string;
    qrCode?: string;
  }): Promise<Site> {
    return await db.site.create({
      data,
    });
  }

  async updateSite(id: string, data: Partial<Site>): Promise<Site> {
    return await db.site.update({
      where: { id },
      data,
    });
  }

  // Personnel
  async getPersonnelBySite(siteId: string) {
    return await db.personnel.findMany({
      where: { siteId },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async getPendingPersonnelBySite(siteId: string): Promise<Personnel[]> {
    const now = new Date();
    return await db.personnel.findMany({
      where: {
        siteId,
        status: "pending",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async getAuthorizedPersonnelBySite(siteId: string): Promise<Personnel[]> {
    return await db.personnel.findMany({
      where: {
        siteId,
        isAuthorized: true,
      },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async getPersonnel(id: string): Promise<Personnel | null> {
    return await db.personnel.findUnique({
      where: { id },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async createPersonnel(data: {
    siteId: string;
    name: string;
    role: string;
    photo?: string;
    status?: string;
    isAuthorized?: boolean;
    currentZone?: string;
    employeeId?: string;
  }): Promise<Personnel> {
    return await db.personnel.create({
      data: {
        ...data,
        status: data.status || "pending",
        isAuthorized: data.isAuthorized || false,
        requestDate: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });
  }

  async updatePersonnelStatus(
    id: string,
    status: string,
    isAuthorized: boolean,
    authorizedBy?: string
  ): Promise<Personnel> {
    return await db.personnel.update({
      where: { id },
      data: {
        status,
        isAuthorized,
        authorizedAt: isAuthorized ? new Date() : null, // Use authorizedAt instead of approvedDate
        authorizedBy: authorizedBy || "admin", // Track who made the decision
        employeeId: isAuthorized ? `EMP${id.slice(-6)}` : null, // Use more characters for unique ID
        expiresAt: isAuthorized
          ? null // No expiry for authorized personnel
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for rejected
      },
    });
  }

  async deletePersonnel(id: string): Promise<void> {
    const personnel = await db.personnel.findUnique({
      where: { id },
    });

    if (personnel?.photo) {
      try {
        // Extract S3 key from URL and delete from S3
        const s3Key = S3Service.extractKeyFromUrl(personnel.photo);
        await S3Service.deleteFile(s3Key);
        console.log(`Deleted photo from S3: ${s3Key}`);
      } catch (error) {
        console.error("Error deleting photo from S3:", error);
        // Continue with personnel deletion even if S3 deletion fails
      }
    }

    await db.personnel.delete({
      where: { id },
    });
  }

  // Cameras
  async getCamerasBySite(siteId: string): Promise<Camera[]> {
    return await db.camera.findMany({
      where: { siteId },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async getCamera(id: string): Promise<Camera | null> {
    return await db.camera.findUnique({
      where: { id },
      include: {
        site: true,
        violations: true,
      },
    });
  }

  async createCamera(data: {
    siteId: string;
    name: string;
    location: string;
    status?: string;
    streamUrl?: string;
    lastActivity?: Date;
  }): Promise<Camera> {
    return await db.camera.create({
      data,
    });
  }

  async updateCameraStatus(id: string, status: string): Promise<Camera> {
    return await db.camera.update({
      where: { id },
      data: {
        status,
        lastActivity: new Date(),
      },
    });
  }

  // Violations
  async getViolationsBySite(siteId: string): Promise<Violation[]> {
    return await db.violation.findMany({
      where: { siteId },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveViolationsBySite(siteId: string): Promise<Violation[]> {
    return await db.violation.findMany({
      where: {
        siteId,
        status: "active",
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getViolation(id: string): Promise<Violation | null> {
    return await db.violation.findUnique({
      where: { id },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
    });
  }

  async createViolation(data: {
    siteId: string;
    cameraId?: string;
    personnelId?: string;
    type: string;
    description: string;
    severity?: string;
    location?: string;
    imageUrl?: string;
  }): Promise<Violation> {
    return await db.violation.create({
      data,
    });
  }

  async resolveViolation(id: string, resolvedBy: string): Promise<Violation> {
    return await db.violation.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  // Incidents
  async getIncidentsBySite(siteId: string): Promise<Incident[]> {
    return await db.incident.findMany({
      where: { siteId },
      orderBy: { reportedAt: "desc" },
    });
  }

  async createIncident(data: {
    siteId: string;
    type: string;
    description: string;
    location?: string;
    severity?: string;
    status?: string;
  }): Promise<Incident> {
    return await db.incident.create({
      data: {
        ...data,
        status: data.status || "active",
        severity: data.severity || "medium",
      },
    });
  }

  // Activities
  async getActivitiesBySite(siteId: string): Promise<Activity[]> {
    return await db.activity.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async createActivity(data: {
    type: string;
    description: string;
    userId?: string;
    siteId?: string;
    metadata?: any;
  }): Promise<Activity> {
    return await db.activity.create({
      data,
    });
  }

  // QR Code
  async generateQRCode(
    siteId: string
  ): Promise<{ siteId: string; qrCode: string; signupUrl: string }> {
    const site = await db.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new Error("Site not found");
    }

    // Use slug in the URL, not siteId
    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${site.id}/signup`;
    const qrCodeDataUrl = await QRCode.toDataURL(signupUrl);

    await storage.updateSiteQRCode(siteId, qrCodeDataUrl);

    return {
      siteId,
      qrCode: qrCodeDataUrl,
      signupUrl,
    };
  }

  async updateSiteQRCode(siteId: string, qrCodeDataUrl: string): Promise<void> {
    await db.site.update({
      where: { id: siteId },
      data: { qrCode: qrCodeDataUrl },
    });
  }

  // Authentication
  async authenticateUser(
    siteCode: string,
    email: string,
    password: string
  ): Promise<{ site: any; user: any } | null> {
    // Simple authentication for now - find site by code
    const site = await db.site.findUnique({
      where: { code: siteCode },
      include: {
        users: true,
      },
    });

    if (!site) {
      return null;
    }

    // Find user by email
    const user = site.users.find((u: any) => u.email === email);
    if (!user || password !== "admin123") {
      return null;
    }

    return { site, user };
  }
}

export const storage = new Storage();
