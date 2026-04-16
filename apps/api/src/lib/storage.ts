import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const USE_R2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID);
const LOCAL_STORAGE_DIR = join(process.cwd(), ".uploads");

// Lazy-init S3 only when R2 is configured
let s3Client: any = null;
function getS3() {
  if (!s3Client) {
    const { S3Client } = require("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

const BUCKET = process.env.R2_BUCKET_NAME ?? "stylescan-assets";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  if (!USE_R2) {
    // Local file storage for development
    mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    const filePath = join(LOCAL_STORAGE_DIR, key.replace(/\//g, "_"));
    writeFileSync(filePath, body);
    return `file://${filePath}`;
  }

  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.R2_PUBLIC_URL ?? `https://${BUCKET}.r2.dev`;
  return `${publicUrl}/${key}`;
}

export async function getPresignedUrl(key: string): Promise<string> {
  if (!USE_R2) {
    const filePath = join(LOCAL_STORAGE_DIR, key.replace(/\//g, "_"));
    return `file://${filePath}`;
  }

  const { GetObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(getS3(), command, { expiresIn: 3600 });
}
