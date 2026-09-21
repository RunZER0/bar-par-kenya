import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadGrant {
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: { "Content-Type": string };
}

export interface DownloadGrant {
  objectKey: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface MediaStorage {
  createUploadGrant(input: { objectKey: string; contentType: string; expiresInSeconds: number }): Promise<UploadGrant>;
  createDownloadGrant(input: { objectKey: string; expiresInSeconds: number }): Promise<DownloadGrant>;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function createR2MediaStorage(config: R2Config): MediaStorage {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async createUploadGrant({ objectKey, contentType, expiresInSeconds }) {
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
      }), { expiresIn: expiresInSeconds });
      return {
        objectKey,
        uploadUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1_000).toISOString(),
        requiredHeaders: { "Content-Type": contentType },
      };
    },
    async createDownloadGrant({ objectKey, expiresInSeconds }) {
      const downloadUrl = await getSignedUrl(client, new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }), { expiresIn: expiresInSeconds });
      return {
        objectKey,
        downloadUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1_000).toISOString(),
      };
    },
  };
}
