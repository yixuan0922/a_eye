import { NextResponse } from "next/server";

export async function GET() {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: [
          "http://localhost:3000",
          "https://localhost:3000",
          "http://127.0.0.1:3000",
          "https://127.0.0.1:3000",
          // Add your production domain here when deployed
          // "https://yourdomain.com"
        ],
        AllowedMethods: ["GET", "HEAD"],
        AllowedHeaders: ["*"],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  const instructions = [
    "🔧 S3 CORS Configuration Instructions:",
    "",
    "1. Go to AWS S3 Console: https://console.aws.amazon.com/s3/",
    "2. Select your bucket: " + bucketName,
    "3. Go to 'Permissions' tab",
    "4. Scroll down to 'Cross-origin resource sharing (CORS)'",
    "5. Click 'Edit'",
    "6. Replace the existing CORS configuration with the JSON below",
    "7. Click 'Save changes'",
    "",
    "❗ Important: This will allow your Next.js app to load images from S3",
    "   for face recognition processing.",
    "",
    "🔒 Security Note: Only localhost origins are included for development.",
    "   Add your production domain when deploying to production.",
  ];

  return NextResponse.json({
    bucketName,
    instructions,
    corsConfiguration: JSON.stringify(corsConfiguration, null, 2),
    note: "This CORS configuration allows your Next.js app to load S3 images for face recognition",
  });
}
