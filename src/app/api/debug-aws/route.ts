import { NextResponse } from "next/server";
import {
  S3Client,
  ListBucketsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

export async function GET() {
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };

  const region = process.env.AWS_REGION || "ap-southeast-1";
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  console.log("AWS Debug Info:", {
    region,
    bucketName,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length,
    secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length,
  });

  try {
    // Test 1: Create S3 client
    const s3Client = new S3Client({
      region,
      credentials,
    });

    // Test 2: List buckets (basic auth test)
    try {
      const listCommand = new ListBucketsCommand({});
      const buckets = await s3Client.send(listCommand);
      console.log(
        "Available buckets:",
        buckets.Buckets?.map((b) => b.Name)
      );

      // Test 3: Check if our specific bucket exists
      const bucketExists = buckets.Buckets?.some((b) => b.Name === bucketName);

      if (!bucketExists) {
        return NextResponse.json({
          success: false,
          error: `Bucket '${bucketName}' not found`,
          availableBuckets: buckets.Buckets?.map((b) => b.Name),
          suggestion: "Check bucket name or create the bucket",
        });
      }

      // Test 4: Check bucket access
      const headCommand = new HeadBucketCommand({ Bucket: bucketName });
      await s3Client.send(headCommand);

      return NextResponse.json({
        success: true,
        message: "AWS S3 is configured correctly!",
        bucketName,
        region,
        bucketCount: buckets.Buckets?.length || 0,
      });
    } catch (listError) {
      return NextResponse.json({
        success: false,
        error: "Failed to list buckets",
        details:
          listError instanceof Error ? listError.message : "Unknown error",
        suggestion: "Check AWS credentials and permissions",
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to create S3 client",
      details: error instanceof Error ? error.message : "Unknown error",
      credentials: {
        region,
        bucketName,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
}
