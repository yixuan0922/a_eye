import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    console.log("PARAMS",params);
    const site = await db.site.findUnique({
      where: { code: params.slug },
    });

    console.log("Response:", site);

    if (!site) {
      return NextResponse.json({ message: "Site not found" }, { status: 404 });
    }
    console.log("Response:", site);

    return NextResponse.json({
      site: {
        id: site.id,
        name: site.name,
      },
    });
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return NextResponse.json(
      { message: "Failed to fetch site" },
      { status: 500 }
    );
  }
}
