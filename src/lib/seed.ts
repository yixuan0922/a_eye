import { db } from "./db";

export async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear all existing data first (respecting foreign key constraints)
    console.log("🧹 Clearing existing data...");
    await db.activity.deleteMany({});
    await db.violation.deleteMany({});
    await db.personnel.deleteMany({});
    await db.camera.deleteMany({});
    await db.user.deleteMany({});
    await db.site.deleteMany({});
    console.log("✅ Existing data cleared");

    // Create sample site (based on SmartSiteSentry)
    const changiSite = await db.site.create({
      data: {
        name: "Changi Construction Site 01",
        qrCode: "",
        code: "changi-site-01",
        location: "Changi East Road, Singapore",
        description: "Main construction site for the Changi project",
        isActive: true,
      },
    });

    console.log("✅ Created site:", changiSite.name);

    // Create admin user for the site
    const adminUser = await db.user.create({
      data: {
        email: "admin@changi01",
        name: "Site Administrator",
        role: "admin",
        siteId: changiSite.id,
        isActive: true,
      },
    });

    console.log("✅ Created admin user:", adminUser.email);

    // Create sample cameras (matching SmartSiteSentry structure)
    const cameraData = [
      {
        siteId: changiSite.id,
        name: "Camera 1 - Main Entry",
        location: "Main Gate Entrance",
        status: "online",
        ipAddress: "192.168.1.101",
      },
      {
        siteId: changiSite.id,
        name: "Camera 2 - Construction Zone A",
        location: "Zone A - Building Foundation",
        status: "online",
        ipAddress: "192.168.1.102",
      },
      {
        siteId: changiSite.id,
        name: "Camera 3 - Material Storage",
        location: "Storage Area Section B",
        status: "offline",
        ipAddress: "192.168.1.103",
      },
      {
        siteId: changiSite.id,
        name: "Camera 4 - High-Risk Zone",
        location: "Crane Operation Area",
        status: "alert",
        ipAddress: "192.168.1.104",
      },
    ];

    const insertedCameras = await Promise.all(
      cameraData.map((camera) => db.camera.create({ data: camera }))
    );
    console.log(`✅ Created ${insertedCameras.length} cameras`);

    // Create sample personnel (matching SmartSiteSentry personnel)
    const personnelData = [
      {
        siteId: changiSite.id,
        name: "David Thompson",
        employeeId: "EMP001",
        department: "Management",
        position: "Site Supervisor",
        status: "authorized",
        accessLevel: "admin",
        authorizedBy: "System Admin",
        authorizedAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
      },
      {
        siteId: changiSite.id,
        name: "Sarah Chen",
        employeeId: "EMP002",
        department: "Safety",
        position: "Safety Officer",
        status: "authorized",
        accessLevel: "supervisor",
        authorizedBy: "David Thompson",
        authorizedAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
      },
      {
        siteId: changiSite.id,
        name: "James Rodriguez",
        employeeId: "EMP003",
        department: "Construction",
        position: "Construction Worker",
        status: "pending",
        accessLevel: "basic",
      },
      {
        siteId: changiSite.id,
        name: "Maria Santos",
        employeeId: "EMP004",
        department: "Engineering",
        position: "Engineer",
        status: "pending",
        accessLevel: "basic",
      },
    ];

    const insertedPersonnel = await Promise.all(
      personnelData.map((personnel) => db.personnel.create({ data: personnel }))
    );
    console.log(`✅ Created ${insertedPersonnel.length} personnel records`);

    // Create sample violations (matching SmartSiteSentry violations)
    const violationData = [
      {
        siteId: changiSite.id,
        cameraId: insertedCameras[3].id, // Camera 4 - High-Risk Zone
        personnelId: insertedPersonnel[0].id, // David Thompson
        type: "ppe",
        description: "Worker without safety helmet detected",
        severity: "high",
        location: "Crane Operation Area",
        status: "active",
        imageUrl:
          "https://images.unsplash.com/photo-1581094794329-c8112a89af12",
        createdAt: new Date(Date.now() - 180000), // 3 minutes ago
      },
      {
        siteId: changiSite.id,
        cameraId: insertedCameras[3].id, // Camera 4 - High-Risk Zone
        personnelId: insertedPersonnel[1].id, // Lisa Park
        type: "ppe",
        description: "Worker without safety vest detected",
        severity: "medium",
        location: "Crane Operation Area",
        status: "active",
        imageUrl:
          "https://images.unsplash.com/photo-1487309078313-fad80c3ec1e5",
        createdAt: new Date(Date.now() - 360000), // 6 minutes ago
      },
      {
        siteId: changiSite.id,
        cameraId: insertedCameras[1].id, // Camera 2 - Construction Zone A
        type: "unauthorized_access",
        description: "Unauthorized personnel detected in restricted area",
        severity: "high",
        location: "Zone A - Building Foundation",
        status: "resolved",
        imageUrl:
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
        resolvedBy: "admin",
        resolvedAt: new Date(Date.now() - 1800000), // 30 minutes ago
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ];

    const insertedViolations = await Promise.all(
      violationData.map((violation) => db.violation.create({ data: violation }))
    );
    console.log(`✅ Created ${insertedViolations.length} violation records`);

    // Additional incidents are tracked as violations in this schema

    // Incidents are handled as violations in this schema

    // Create sample activities (matching SmartSiteSentry activity patterns)
    const activityData = [
      {
        type: "personnel_approved",
        description: "Personnel David Thompson approved for site access",
        siteId: changiSite.id,
        metadata: { personnelId: insertedPersonnel[0].id },
        createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
      },
      {
        type: "personnel_approved",
        description: "Personnel Lisa Park approved for site access",
        siteId: changiSite.id,
        metadata: { personnelId: insertedPersonnel[1].id },
        createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
      },
      {
        type: "violation_detected",
        description: "PPE violation detected - no helmet in high-risk zone",
        siteId: changiSite.id,
        metadata: {
          violationId: insertedViolations[0].id,
          cameraId: insertedCameras[3].id,
        },
        createdAt: new Date(Date.now() - 180000), // 3 minutes ago
      },
      {
        type: "violation_detected",
        description: "PPE violation detected - no safety vest",
        siteId: changiSite.id,
        metadata: {
          violationId: insertedViolations[1].id,
          cameraId: insertedCameras[3].id,
        },
        createdAt: new Date(Date.now() - 360000), // 6 minutes ago
      },
      {
        type: "violation_resolved",
        description: "Unauthorized access violation resolved",
        siteId: changiSite.id,
        metadata: { violationId: insertedViolations[2].id },
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      },
      {
        type: "security_alert",
        description:
          "Camera 4 status changed to alert - high-risk zone monitoring",
        siteId: changiSite.id,
        metadata: { cameraId: insertedCameras[3].id },
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
      },
    ];

    const insertedActivities = await Promise.all(
      activityData.map((activity) => db.activity.create({ data: activity }))
    );
    console.log(`✅ Created ${insertedActivities.length} activity records`);

    console.log("🎉 Database seeded successfully!");
    console.log("📋 Login credentials:");
    console.log(`   Site Code: ${changiSite.code}`);
    console.log(`   Admin Email: ${adminUser.email}`);
    console.log(`   Admin Password: admin123`);
    console.log("");
    console.log("👥 Sample Personnel:");
    console.log("   - David Thompson (Site Supervisor) - Authorized");
    console.log("   - Sarah Chen (Safety Officer) - Authorized");
    console.log("   - James Rodriguez (Construction Worker) - Pending");
    console.log("   - Maria Santos (Engineer) - Pending");
    console.log("");
    console.log("📹 Sample Cameras:");
    console.log("   - Camera 1: Main Entry (online)");
    console.log("   - Camera 2: Construction Zone A (online)");
    console.log("   - Camera 3: Material Storage (offline)");
    console.log("   - Camera 4: High-Risk Zone (alert)");
    console.log("");
    console.log("⚠️  Sample Violations:");
    console.log("   - PPE violation: No helmet (active)");
    console.log("   - PPE violation: No safety vest (active)");
    console.log("   - Unauthorized access (resolved)");
    console.log("");
    console.log("🔗 Dashboard URL:");
    console.log(`   http://localhost:3000/login`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
