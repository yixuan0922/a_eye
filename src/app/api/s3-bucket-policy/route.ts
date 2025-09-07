import { NextResponse } from "next/server";

export async function GET() {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  const bucketPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
    ],
  };

  const instructions = [
    "1. Go to AWS S3 Console",
    "2. Select your bucket: " + bucketName,
    "3. Go to 'Permissions' tab",
    "4. Scroll down to 'Bucket policy'",
    "5. Click 'Edit' and paste the policy below",
    "6. Click 'Save changes'",
    "",
    "Alternative: Enable public access in 'Block public access settings'",
    "- Uncheck 'Block all public access'",
    "- Uncheck 'Block public access to buckets and objects granted through new public bucket or access point policies'",
  ];

  return NextResponse.json({
    bucketName,
    instructions,
    bucketPolicy: JSON.stringify(bucketPolicy, null, 2),
    note: "This policy allows public read access to all objects in your bucket",
  });
}
