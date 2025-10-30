import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Validate AWS configuration on startup
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("AWS credentials not found in environment variables");
}

if (!process.env.AWS_S3_BUCKET) {
  console.warn("AWS_S3_BUCKET not set in environment variables");
}

// Configure AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  bucket?: string;
  folder?: string;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  mimeType: string;
  size?: number;
  originalSize?: number;
  compressionRatio?: number;
}

export class S3Helper {
  private bucketName: string;
  private region: string;

  constructor(bucketName?: string) {
    this.bucketName = bucketName || process.env.AWS_S3_BUCKET || "default-bucket";
    this.region = process.env.AWS_REGION || "ap-southeast-1";
  }

  /**
   * Upload file to S3 with optional image compression
   */
  async uploadFile(file: Buffer | string, originalName: string, options: UploadOptions = {}): Promise<UploadResult> {
    const { quality = 80, maxWidth = 1920, maxHeight = 1080, bucket = this.bucketName, folder = "uploads" } = options;

    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    const uniqueId = uuidv4();

    const isImage = this.isImageFile(originalName);

    let fileBuffer: Buffer;
    if (typeof file === "string") {
      fileBuffer = Buffer.from(file, "base64");
    } else {
      fileBuffer = file;
    }

    const result: UploadResult = {
      key: "",
      bucket: this.bucketName,
      url: "",
      mimeType: this.getMimeType(originalName),
    };

    const prefix = process.env.NODE_ENV === "production" ? "" : "staging/";

    try {
      if (isImage) {
        const compressionResult = await this.compressToJPEG(fileBuffer, {
          quality,
          maxWidth,
          maxHeight,
        });

        const compressionRatio = (
          ((compressionResult.originalSize - compressionResult.size) / compressionResult.originalSize) *
          100
        ).toFixed(2);

        const key = `${prefix}${folder}/${uniqueId}-${baseName}.jpeg`;
        const url = await this.uploadToS3(compressionResult.buffer, key, bucket, "image/jpeg");

        result.key = key;
        result.url = url;
        result.size = compressionResult.size;
        result.mimeType = "image/jpeg";
        result.originalSize = compressionResult.originalSize;
        result.compressionRatio = parseFloat(compressionRatio);

        if (process.env.NODE_ENV !== "production") {
          console.log("🗜️ Compression Results:");
          console.log(`Original size: ${this.formatFileSize(compressionResult.originalSize)}`);
          console.log(`Compressed size: ${this.formatFileSize(compressionResult.size)}`);
          console.log(`Compression ratio: ${compressionRatio}%`);
          console.log(
            `Size reduction: ${this.formatFileSize(compressionResult.originalSize - compressionResult.size)}`
          );
        }
      } else {
        const key = `${prefix}${folder}/${uniqueId}-${baseName}${fileExtension}`;
        const url = await this.uploadToS3(fileBuffer, key, bucket, result.mimeType);

        result.key = key;
        result.url = url;
        result.size = fileBuffer.length;
      }

      return result;
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer | string; name: string }>,
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file.buffer, file.name, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string, bucket?: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: key,
    });

    try {
      await s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMultipleFiles(keys: string[], bucket?: string): Promise<void> {
    const command = new DeleteObjectsCommand({
      Bucket: bucket || this.bucketName,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });

    try {
      await s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete files: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get signed URL for temporary access (default: 24 hours)
   */
  async getSignedUrl(key: string, expiresIn: number = 86400, bucket?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get S3 object data
   */
  async getS3Object(key: string, bucket?: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: key,
    });

    try {
      const response = await s3Client.send(command);
      const stream = response.Body;

      if (!stream) {
        throw new Error("No body in response");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to get S3 object: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string, bucket?: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: key,
    });

    try {
      await s3Client.send(command);
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string, bucket?: string) {
    const command = new HeadObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: key,
    });

    try {
      return await s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Compress image to JPEG format
   */
  private async compressToJPEG(
    buffer: Buffer,
    options: {
      quality: number;
      maxWidth: number;
      maxHeight: number;
    }
  ): Promise<{ buffer: Buffer; size: number; originalSize: number }> {
    const originalSize = buffer.length;

    const compressedBuffer = await sharp(buffer)
      .resize(options.maxWidth, options.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: options.quality,
        progressive: true,
      })
      .toBuffer();

    return {
      buffer: compressedBuffer,
      size: compressedBuffer.length,
      originalSize: originalSize,
    };
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(buffer: Buffer, key: string, bucket: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "max-age=31536000",
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      await s3Client.send(command);

      // Construct the URL manually since v3 doesn't return Location
      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
      return url;
    } catch (error: unknown) {
      const err = error as Error & { name?: string; $metadata?: { httpStatusCode?: number } };
      console.error("S3 Upload Error:", {
        bucket,
        key,
        error: err.message,
        name: err.name,
        statusCode: err.$metadata?.httpStatusCode,
      });

      // Provide specific error messages
      if (err.name === "AccessDenied") {
        throw new Error(`S3 Access Denied: Check your AWS credentials and bucket permissions for bucket: ${bucket}`);
      } else if (err.name === "NoSuchBucket") {
        throw new Error(`S3 Bucket Not Found: The bucket '${bucket}' does not exist or is not accessible`);
      } else if (err.name === "InvalidAccessKeyId") {
        throw new Error("S3 Invalid Access Key: Check your AWS_ACCESS_KEY_ID environment variable");
      } else if (err.name === "SignatureDoesNotMatch") {
        throw new Error("S3 Invalid Secret Key: Check your AWS_SECRET_ACCESS_KEY environment variable");
      }

      throw new Error(`S3 Upload Failed: ${err.message || "Unknown error"}`);
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".svg", ".avif"];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".tiff": "image/tiff",
      ".svg": "image/svg+xml",
      ".avif": "image/avif",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Export singleton instance
export const s3Helper = new S3Helper();

// Export default instance
export default s3Helper;
