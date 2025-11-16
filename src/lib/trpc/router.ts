import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { storage } from "../storage";
import { db } from "../db";
import { S3Service } from "../s3";

export const appRouter = router({
  // Sites
  getSite: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await storage.getSite(input);
  }),

  getSiteBySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await storage.getSiteBySlug(input);
  }),

  getSiteByCode: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await storage.getSiteByCode(input);
  }),

  createSite: publicProcedure
    .input(
      z.object({
        name: z.string(),
        code: z.string(),
        location: z.string(),
        description: z.string().optional(),
        qrCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createSite(input);
    }),

  // Personnel
  getPersonnelBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getPersonnelBySite(input);
    }),

  getPendingPersonnelBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getPendingPersonnelBySite(input);
    }),

  getAuthorizedPersonnelBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getAuthorizedPersonnelBySite(input);
    }),

  createPersonnel: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        name: z.string(),
        role: z.string(),
        photo: z.string().optional(),
        status: z.string().optional(),
        isAuthorized: z.boolean().optional(),
        currentZone: z.string().optional(),
        employeeId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createPersonnel(input);
    }),

  updatePersonnelStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
        isAuthorized: z.boolean(),
        authorizedBy: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Read current record to access name and photos for side-effects
      const existing = await db.personnel.findUnique({
        where: { id: input.id },
      });

      const updated = await storage.updatePersonnelStatus(
        input.id,
        input.status,
        input.isAuthorized,
        input.authorizedBy
      );

      // On approval: send faces from S3 to Jetson/Flask
      if (input.isAuthorized) {
        try {
          const photoUrls = (existing?.photos as string[]) || [];
          if (photoUrls.length > 0) {
            const formData = new FormData();

            // Download each S3 photo and attach as a file part
            await Promise.all(
              photoUrls.map(async (url, index) => {
                const res = await fetch(url);
                if (!res.ok)
                  throw new Error(`Failed to fetch photo ${index + 1}`);
                const contentType =
                  res.headers.get("content-type") || "image/jpeg";
                const arrayBuffer = await res.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: contentType });
                formData.append("files", blob, `photo_${index}.jpg`);
              })
            );

            // Include metadata expected by Flask
            formData.append("name", existing?.name || "");
            formData.append("personnelId", input.id);

            const flaskUrl =
              process.env.FLASK_ADD_FACES_URL ||
              "https://aeye001.biofuel.osiris.sg/api/add_faces";

            const resp = await fetch(flaskUrl, {
              method: "POST",
              body: formData,
            });

            // Log but do not block UI on non-2xx (partial/temporary errors shouldn't break approval)
            if (!resp.ok && resp.status !== 207) {
              let body: any;
              try {
                body = await resp.json();
              } catch {
                body = await resp.text();
              }
              console.warn("Flask add_faces non-OK:", resp.status, body);
            }
          }
        } catch (error) {
          console.error("Failed to add faces to Jetson after approval:", error);
        }
      } else if (input.status === "rejected") {
        // On rejection: delete all stored S3 photos and clear field
        try {
          const photoUrls = (existing?.photos as string[]) || [];
          if (photoUrls.length > 0) {
            await S3Service.deleteMultipleFiles(photoUrls);
            await db.personnel.update({
              where: { id: input.id },
              data: { photos: [] },
            });
          }
        } catch (error) {
          console.error("Failed to clean up S3 photos on rejection:", error);
        }
      }

      return updated;
    }),

  updatePersonnel: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        position: z.string().optional(),
        department: z.string().optional(),
        accessLevel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await storage.updatePersonnel(id, data);
    }),

  deletePersonnel: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return await storage.deletePersonnel(input);
    }),

  // Cameras
  getCamerasBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getCamerasBySite(input);
    }),

  createCamera: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        name: z.string(),
        location: z.string(),
        status: z.string().optional(),
        streamUrl: z.string().optional(),
        lastActivity: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createCamera(input);
    }),

  updateCameraStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.updateCameraStatus(input.id, input.status);
    }),

  // Violations
  getViolationsBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getViolationsBySite(input);
    }),

  getActiveViolationsBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getActiveViolationsBySite(input);
    }),

  createViolation: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        cameraId: z.string().optional(),
        personnelId: z.string().optional(),
        type: z.string(),
        description: z.string(),
        severity: z.string().optional(),
        location: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createViolation(input);
    }),

  resolveViolation: publicProcedure
    .input(
      z.object({
        id: z.string(),
        resolvedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.resolveViolation(input.id, input.resolvedBy);
    }),

  // PPE Violations
  getPPEViolationsBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getPPEViolationsBySite(input.siteId, input.limit, input.skip);
    }),

  getActivePPEViolationsBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getActivePPEViolationsBySite(input.siteId, input.limit, input.skip);
    }),

  getPPEViolationsCount: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getPPEViolationsCount(input);
    }),

  getPPEViolation: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getPPEViolation(input);
    }),

  createPPEViolation: publicProcedure
    .input(
      z.object({
        personName: z.string(),
        personnelId: z.string().optional(),
        confidenceScore: z.number().optional(),
        siteId: z.string(),
        cameraId: z.string().optional(),
        cameraName: z.string(),
        location: z.string().optional(),
        previousState: z.string(),
        currentState: z.string(),
        ppeWearing: z.array(z.string()),
        ppeMissing: z.array(z.string()),
        ppeRequired: z.array(z.string()),
        violationReason: z.string(),
        severity: z.string().optional(),
        detectionTimestamp: z.string().or(z.date()),
        snapshotUrl: z.string().optional(),
        snapshotMetadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createPPEViolation({
        ...input,
        detectionTimestamp: new Date(input.detectionTimestamp),
      });
    }),

  resolvePPEViolation: publicProcedure
    .input(
      z.object({
        id: z.string(),
        resolvedBy: z.string(),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.resolvePPEViolation(
        input.id,
        input.resolvedBy,
        input.resolutionNotes
      );
    }),

  acknowledgePPEViolation: publicProcedure
    .input(
      z.object({
        id: z.string(),
        acknowledgedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.acknowledgePPEViolation(
        input.id,
        input.acknowledgedBy
      );
    }),

  // Unauthorized Access
  getUnauthorizedAccessBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getUnauthorizedAccessBySite(
        input.siteId,
        input.limit,
        input.skip
      );
    }),

  getActiveUnauthorizedAccessBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getActiveUnauthorizedAccessBySite(
        input.siteId,
        input.limit,
        input.skip
      );
    }),

  getUnauthorizedAccessCount: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getUnauthorizedAccessCount(input);
    }),

  resolveUnauthorizedAccess: publicProcedure
    .input(
      z.object({
        id: z.string(),
        resolvedBy: z.string(),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.resolveUnauthorizedAccess(
        input.id,
        input.resolvedBy,
        input.resolutionNotes
      );
    }),

  // Restricted Zone Violations
  getRestrictedZoneViolationsBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getRestrictedZoneViolationsBySite(
        input.siteId,
        input.limit,
        input.skip
      );
    }),

  getActiveRestrictedZoneViolationsBySite: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await storage.getActiveRestrictedZoneViolationsBySite(
        input.siteId,
        input.limit,
        input.skip
      );
    }),

  getRestrictedZoneViolationsCount: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getRestrictedZoneViolationsCount(input);
    }),

  // Incidents
  getIncidentsBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getIncidentsBySite(input);
    }),

  createIncident: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        type: z.string(),
        description: z.string(),
        location: z.string().optional(),
        severity: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createIncident(input);
    }),

  // Activities
  getActivitiesBySite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await storage.getActivitiesBySite(input);
    }),

  createActivity: publicProcedure
    .input(
      z.object({
        type: z.string(),
        description: z.string(),
        userId: z.string().optional(),
        siteId: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.createActivity(input);
    }),

  // QR Code
  generateQRCode: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return await storage.generateQRCode(input);
    }),

  // Authentication
  login: publicProcedure
    .input(
      z.object({
        siteCode: z.string(),
        email: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await storage.authenticateUser(
        input.siteCode,
        input.email,
        input.password
      );
      if (!result) {
        throw new Error("Invalid credentials or site not found");
      }

      return result;
    }),

  // Camera Feed

  // Face recognition procedures (using Personnel model)
  getKnownFaces: publicProcedure
    .input(z.string())
    .query(async ({ input: siteId }) => {
      return await db.personnel.findMany({
        where: {
          siteId,
          isAuthorized: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  addKnownFace: publicProcedure
    .input(
      z.object({
        name: z.string(),
        siteId: z.string(),
        descriptor: z.array(z.number()),
        photoUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.personnel.create({
        data: {
          name: input.name,
          siteId: input.siteId,
          faceDescriptor: input.descriptor,
          photos: [input.photoUrl],
          isAuthorized: true,
          status: "approved",
        },
      });
    }),

  deleteKnownFace: publicProcedure
    .input(z.string())
    .mutation(async ({ input: faceId }) => {
      return await db.personnel.delete({
        where: { id: faceId },
      });
    }),

  // Attendance procedures
  getAttendance: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        date: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const targetDate = input.date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await db.attendance.findMany({
        where: {
          siteId: input.siteId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          personnel: true,
        },
        orderBy: { timestamp: "desc" },
      });
    }),

  markAttendance: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        personnelId: z.string(),
        confidence: z.number(),
        timestamp: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = input.timestamp || new Date();

      // Check if already marked within last 30 seconds
      const recentAttendance = await db.attendance.findFirst({
        where: {
          siteId: input.siteId,
          personnelId: input.personnelId,
          timestamp: {
            gte: new Date(now.getTime() - 30000), // 30 seconds ago
          },
        },
      });

      if (recentAttendance) {
        return recentAttendance; // Don't create duplicate
      }

      return await db.attendance.create({
        data: {
          siteId: input.siteId,
          personnelId: input.personnelId,
          confidence: input.confidence,
          timestamp: now,
        },
      });
    }),

  getAttendanceReport: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const attendance = await db.attendance.findMany({
        where: {
          siteId: input.siteId,
          timestamp: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: {
          personnel: true,
        },
        orderBy: { timestamp: "desc" },
      });

      // Group by person and day
      const report = attendance.reduce((acc, record) => {
        const date = record.timestamp.toDateString();
        const personId = record.personnelId;

        if (!acc[personId]) {
          acc[personId] = {
            name: record.personnel.name,
            photoUrl: record.personnel.photos
              ? Array.isArray(record.personnel.photos)
                ? record.personnel.photos[0]
                : null
              : null,
            days: {},
          };
        }

        if (!acc[personId].days[date]) {
          acc[personId].days[date] = {
            date,
            present: true,
            firstSeen: record.timestamp,
            lastSeen: record.timestamp,
            totalDetections: 1,
            cameras: [],
          };
        } else {
          acc[personId].days[date].lastSeen = record.timestamp;
          acc[personId].days[date].totalDetections++;
        }

        return acc;
      }, {} as any);

      return Object.values(report);
    }),

  updateCameraStream: publicProcedure
    .input(
      z.object({
        cameraId: z.string(),
        streamUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.camera.update({
        where: { id: input.cameraId },
        data: {
          streamUrl: input.streamUrl,
          status: input.streamUrl ? "online" : "offline",
        },
      });
    }),

  testCameraConnection: publicProcedure
    .input(z.string())
    .query(async ({ input: streamUrl }) => {
      try {
        // Test the stream URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(streamUrl, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return { success: response.ok, status: response.status };
      } catch (error) {
        return { success: false, error: "Connection failed" };
      }
    }),

  // P2P Connection Management
  establishP2PConnection: publicProcedure
    .input(
      z.object({
        serialNumber: z.string(),
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch("/api/p2p-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error("P2P connection failed");
        }

        const result = await response.json();
        return result;
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "P2P connection failed",
        };
      }
    }),

  updateCameraWithP2P: publicProcedure
    .input(
      z.object({
        cameraId: z.string(),
        p2pStreamUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.camera.update({
        where: { id: input.cameraId },
        data: {
          streamUrl: input.p2pStreamUrl,
          status: "online",
        },
      });
    }),
});

export type AppRouter = typeof appRouter;
