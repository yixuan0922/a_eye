import { db } from "./db";
import type {
  Site,
  Personnel,
  Camera,
  Violation,
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
    // Site model doesn't have slug field, using code instead
    return await db.site.findUnique({
      where: { code: slug },
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
    code: string;
    location: string;
    description?: string;
    qrCode?: string;
  }): Promise<Site> {
    return await db.site.create({
      data: {
        name: data.name,
        code: data.code,
        location: data.location,
        description: data.description,
        qrCode: data.qrCode,
      },
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

  async updatePersonnel(
    id: string,
    data: {
      name?: string;
      role?: string;
      position?: string;
      department?: string;
      accessLevel?: string;
    }
  ): Promise<Personnel> {
    return await db.personnel.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async deletePersonnel(id: string): Promise<void> {
    const personnel = await db.personnel.findUnique({
      where: { id },
    });

    if (!personnel) {
      throw new Error("Personnel not found");
    }

    // Delete face from Flask face recognition API
    try {
      const flaskUrl = process.env.FLASK_API_URL || "https://aeye001.biofuel.osiris.sg";
      const response = await fetch(`${flaskUrl}/api/delete_face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    } catch (error) {
      console.error("Error calling Flask API delete_face:", error);
      // Continue with deletion even if Flask API fails
    }

    // Delete all photos from S3
    if (personnel.photos && Array.isArray(personnel.photos) && personnel.photos.length > 0) {
      try {
        const photoUrls = personnel.photos.filter((p): p is string => typeof p === 'string');
        await S3Service.deleteMultipleFiles(photoUrls);
        console.log(`Deleted ${photoUrls.length} photos from S3`);
      } catch (error) {
        console.error("Error deleting photos from S3:", error);
        // Continue with personnel deletion even if S3 deletion fails
      }
    }

    // Delete personnel from database
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
        updatedAt: new Date(),
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

  // PPE Violations
  async getPPEViolationsBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.pPEViolation.findMany({
      where: { siteId },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { detectionTimestamp: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getActivePPEViolationsBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.pPEViolation.findMany({
      where: {
        siteId,
        status: "active",
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { detectionTimestamp: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getPPEViolation(id: string): Promise<any | null> {
    return await db.pPEViolation.findUnique({
      where: { id },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
    });
  }

  async createPPEViolation(data: {
    personName: string;
    personnelId?: string;
    confidenceScore?: number;
    siteId: string;
    cameraId?: string;
    cameraName: string;
    location?: string;
    previousState: string;
    currentState: string;
    ppeWearing: string[];
    ppeMissing: string[];
    ppeRequired: string[];
    violationReason: string;
    severity?: string;
    detectionTimestamp: Date;
    snapshotUrl?: string;
    snapshotMetadata?: any;
  }): Promise<any> {
    return await db.pPEViolation.create({
      data: {
        ...data,
        severity: data.severity || "medium",
        status: "active",
      },
    });
  }

  async resolvePPEViolation(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<any> {
    return await db.pPEViolation.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes,
      },
    });
  }

  async acknowledgePPEViolation(
    id: string,
    acknowledgedBy: string
  ): Promise<any> {
    return await db.pPEViolation.update({
      where: { id },
      data: {
        status: "acknowledged",
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });
  }

  async getPPEViolationsCount(siteId: string): Promise<number> {
    return await db.pPEViolation.count({
      where: { siteId },
    });
  }

  // Unauthorized Access
  async getUnauthorizedAccessBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.unauthorizedAccess.findMany({
      where: { siteId },
      include: {
        site: true,
        camera: true,
        identifiedPersonnel: true,
      },
      orderBy: { detectionTimestamp: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getActiveUnauthorizedAccessBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.unauthorizedAccess.findMany({
      where: {
        siteId,
        status: "active",
      },
      include: {
        site: true,
        camera: true,
        identifiedPersonnel: true,
      },
      orderBy: { detectionTimestamp: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getUnauthorizedAccessCount(siteId: string): Promise<number> {
    return await db.unauthorizedAccess.count({
      where: { siteId },
    });
  }

  async resolveUnauthorizedAccess(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<any> {
    return await db.unauthorizedAccess.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes,
      },
    });
  }

  // Restricted Zone Violations (using Violation table with type filter)
  async getRestrictedZoneViolationsBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.violation.findMany({
      where: {
        siteId,
        type: "restricted_zone",
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getActiveRestrictedZoneViolationsBySite(siteId: string, limit: number = 10, skip: number = 0): Promise<any[]> {
    return await db.violation.findMany({
      where: {
        siteId,
        type: "restricted_zone",
        status: "active",
      },
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });
  }

  async getRestrictedZoneViolationsCount(siteId: string): Promise<number> {
    return await db.violation.count({
      where: {
        siteId,
        type: "restricted_zone",
      },
    });
  }

  // Incidents (temporarily disabled - no Incident model in schema)
  async getIncidentsBySite(siteId: string): Promise<any[]> {
    // return await db.incident.findMany({
    //   where: { siteId },
    //   orderBy: { reportedAt: "desc" },
    // });
    return [];
  }

  async createIncident(data: {
    siteId: string;
    type: string;
    description: string;
    location?: string;
    severity?: string;
    status?: string;
  }): Promise<any> {
    // return await db.incident.create({
    //   data: {
    //     ...data,
    //     status: data.status || "active",
    //     severity: data.severity || "medium",
    //   },
    // });
    throw new Error("Incident model not available");
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

    // Use site code in the URL, not siteId
    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${site.code}/signup`;
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
