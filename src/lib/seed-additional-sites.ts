import { db } from "./db";

/**
 * SAFE SEED SCRIPT - DOES NOT DELETE ANY EXISTING DATA
 * This script only adds additional sites and sample data for those sites
 */
export async function seedAdditionalSites() {
  console.log("🌱 Adding additional sites (preserving existing data)...");

  try {
    // Check if changi-site-02 already exists
    const existingSite02 = await db.site.findUnique({
      where: { code: "changi-site-02" },
    });

    if (!existingSite02) {
      const changiSite02 = await db.site.create({
        data: {
          name: "Changi Construction Site 02",
          qrCode: "",
          code: "changi-site-02",
          location: "Changi Business Park, Singapore",
          description: "Secondary construction site for the Changi project",
          isActive: true,
        },
      });
      console.log("✅ Created site:", changiSite02.name);

      // Add cameras for changi-site-02
      await db.camera.createMany({
        data: [
          {
            siteId: changiSite02.id,
            name: "Camera 1 - East Entrance",
            location: "East Gate",
            status: "online",
            ipAddress: "192.168.2.101",
          },
          {
            siteId: changiSite02.id,
            name: "Camera 2 - Construction Zone B",
            location: "Zone B - Steel Framework",
            status: "online",
            ipAddress: "192.168.2.102",
          },
        ],
      });
      console.log("✅ Added cameras for changi-site-02");
    } else {
      console.log("ℹ️  changi-site-02 already exists, skipping");
    }

    // Check if marina-bay-01 already exists
    const existingMarina = await db.site.findUnique({
      where: { code: "marina-bay-01" },
    });

    if (!existingMarina) {
      const marinaBaySite = await db.site.create({
        data: {
          name: "Marina Bay Development",
          qrCode: "",
          code: "marina-bay-01",
          location: "Marina Bay, Singapore",
          description: "Commercial development project at Marina Bay",
          isActive: true,
        },
      });
      console.log("✅ Created site:", marinaBaySite.name);

      // Add cameras for marina-bay-01
      await db.camera.createMany({
        data: [
          {
            siteId: marinaBaySite.id,
            name: "Camera 1 - Lobby",
            location: "Main Lobby",
            status: "online",
            ipAddress: "192.168.3.101",
          },
          {
            siteId: marinaBaySite.id,
            name: "Camera 2 - Construction Area",
            location: "Ground Floor Construction",
            status: "online",
            ipAddress: "192.168.3.102",
          },
        ],
      });
      console.log("✅ Added cameras for marina-bay-01");
    } else {
      console.log("ℹ️  marina-bay-01 already exists, skipping");
    }

    // Get or create multi-site supervisor user
    const existingSupervisor = await db.user.findUnique({
      where: { email: "supervisor@sites" },
    });

    if (!existingSupervisor) {
      const allSites = await db.site.findMany();

      await db.user.create({
        data: {
          email: "supervisor@sites",
          name: "Multi-Site Supervisor",
          password: "$2a$10$YourHashedPasswordHere",
          isActive: true,
          sites: {
            create: allSites.map((site) => ({
              siteId: site.id,
              role: "supervisor",
            })),
          },
        },
      });
      console.log("✅ Created multi-site supervisor user");
    } else {
      console.log("ℹ️  Multi-site supervisor already exists");
    }

    console.log("🎉 Additional sites seeded successfully!");
    console.log("\n📋 You can now:");
    console.log("   - Access changi-site-02 and marina-bay-01");
    console.log("   - Login as supervisor@sites (password: admin123) to access all sites");
    console.log("   - Use /admin/users to manage user site assignments");
  } catch (error) {
    console.error("❌ Error seeding additional sites:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAdditionalSites()
    .then(() => {
      console.log("Seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
