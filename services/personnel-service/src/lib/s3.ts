import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
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
    file: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      console.log('S3 Upload attempt:', {
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
      });

      const result = await s3Client.send(command);
      console.log('S3 Upload successful:', result);

      // Return the public URL
      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || 'us-east-1'
      }.amazonaws.com/${key}`;
      console.log('Generated S3 URL:', url);
      return url;
    } catch (error) {
      console.error('S3 Upload Error Details:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        bucket: BUCKET_NAME,
        key,
        region: process.env.AWS_REGION,
      });
      throw new Error(
        `Failed to upload file to S3: ${
          error instanceof Error ? error.message : 'Unknown error'
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
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
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
    const extension = fileName.split('.').pop() || 'jpg';
    return `personnel/${personnelId}/${timestamp}.${extension}`;
  }

  /**
   * Extract key from S3 URL
   */
  static extractKeyFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/'); // Remove https://bucket-name.s3.region.amazonaws.com/
  }

  /**
   * Upload multiple files to S3 for personnel photos
   */
  static async uploadMultiplePersonnelPhotos(
    files: Express.Multer.File[],
    personnelId: string
  ): Promise<string[]> {
    const uploadPromises = files.map(async (file, index) => {
      // Generate unique key with index to avoid conflicts
      const fileKey = this.generatePersonnelPhotoKey(
        personnelId,
        `${index}_${file.originalname}`
      );

      return this.uploadFile(file.buffer, fileKey, file.mimetype);
    });

    try {
      const photoUrls = await Promise.all(uploadPromises);
      console.log(
        `Successfully uploaded ${photoUrls.length} photos for personnel ${personnelId}`
      );
      return photoUrls;
    } catch (error) {
      console.error('Error uploading multiple photos:', error);
      throw new Error('Failed to upload one or more photos');
    }
  }

  /**
   * Delete multiple files from S3 using URLs
   */
  static async deleteMultipleFiles(urls: string[]): Promise<void> {
    const deletePromises = urls.map((url) => {
      const key = this.extractKeyFromUrl(url);
      return this.deleteFile(key);
    });

    try {
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${urls.length} photos from S3`);
    } catch (error) {
      console.error('Error deleting multiple photos:', error);
      throw new Error('Failed to delete one or more photos');
    }
  }
}

export default S3Service;
