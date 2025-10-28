import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export class S3Service {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      console.log("S3 Upload attempt:", {
        bucket: BUCKET_NAME,
        key,
        contentType,
        region: process.env.AWS_REGION,
        fileSize: file.length,
      });

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        // ACL: 'public-read', // Remove this line - bucket doesn't allow ACLs
      });

      const result = await s3Client.send(command);
      console.log("S3 Upload successful:", result);

      // Return the public URL
      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;
      console.log("Generated S3 URL:", url);
      return url;
    } catch (error) {
      console.error("S3 Upload Error Details:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        bucket: BUCKET_NAME,
        key,
        region: process.env.AWS_REGION,
      });
      throw new Error(
        `Failed to upload file to S3: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw new Error("Failed to delete file from S3");
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  static async getPresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new Error("Failed to generate presigned URL");
    }
  }

  /**
   * Generate a unique file key for personnel photos
   */
  static generatePersonnelPhotoKey(
    personnelId: string,
    fileName: string
  ): string {
    const timestamp = Date.now();
    const extension = fileName.split(".").pop() || "jpg";
    return `personnel/${personnelId}/${timestamp}.${extension}`;
  }

  /**
   * Extract key from S3 URL
   */
  static extractKeyFromUrl(url: string): string {
    const urlParts = url.split("/");
    return urlParts.slice(3).join("/"); // Remove https://bucket-name.s3.region.amazonaws.com/
  }

  /**
   * Convert S3 protocol URL (s3://bucket/key) to HTTPS URL
   * Can be used on both client and server side
   */
  static convertS3UrlToHttps(s3Url: string, region: string = 'ap-southeast-1'): string {
    // If already an HTTPS URL, return as is
    if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
      return s3Url;
    }

    // Parse s3://bucket/key format
    if (s3Url.startsWith('s3://')) {
      const withoutProtocol = s3Url.replace('s3://', '');
      const parts = withoutProtocol.split('/');
      const bucket = parts[0];
      const key = parts.slice(1).join('/');

      // Return HTTPS URL
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    // If format is unrecognized, return original
    return s3Url;
  }

  /**
   * Upload multiple files to S3 for personnel photos
   */
  static async uploadMultiplePersonnelPhotos(
    files: File[],
    personnelId: string
  ): Promise<string[]> {
    const uploadPromises = files.map(async (file, index) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique key with index to avoid conflicts
      const fileKey = this.generatePersonnelPhotoKey(
        personnelId,
        `${index}_${file.name}`
      );
      
      return this.uploadFile(buffer, fileKey, file.type);
    });

    try {
      const photoUrls = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${photoUrls.length} photos for personnel ${personnelId}`);
      return photoUrls;
    } catch (error) {
      console.error("Error uploading multiple photos:", error);
      throw new Error("Failed to upload one or more photos");
    }
  }

  /**
   * Delete multiple files from S3 using URLs
   */
  static async deleteMultipleFiles(urls: string[]): Promise<void> {
    const deletePromises = urls.map(url => {
      const key = this.extractKeyFromUrl(url);
      return this.deleteFile(key);
    });

    try {
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${urls.length} photos from S3`);
    } catch (error) {
      console.error("Error deleting multiple photos:", error);
      throw new Error("Failed to delete one or more photos");
    }
  }
}

export default S3Service;

/**
 * Client-side utility to convert S3 URLs
 * This can be imported in client components without bundling AWS SDK
 */
export function convertS3UrlToHttps(s3Url: string | null | undefined, region: string = 'ap-southeast-1'): string | null {
  if (!s3Url) return null;

  // If already an HTTPS URL, return as is
  if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
    return s3Url;
  }

  // Parse s3://bucket/key format
  if (s3Url.startsWith('s3://')) {
    const withoutProtocol = s3Url.replace('s3://', '');
    const parts = withoutProtocol.split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    // Return HTTPS URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // If format is unrecognized, return original
  return s3Url;
}
 