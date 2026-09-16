import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/index.js";
import { NotFoundError } from "@/errors/index.js";
import type {
  StorageDriver,
  PutObjectInput,
  PutObjectOutput,
  ResolveDocInput,
  ResolveDocOutput,
  RemoveDocInput,
} from "@/services/storage/storage.driver.js";

export class S3StorageDriver implements StorageDriver {
  readonly provider = "S3" as const;
  private readonly client: S3Client;
  private readonly defaultBucket: string;

  constructor(client?: S3Client, bucket?: string) {
    this.defaultBucket = bucket || env.S3_BUCKET || "";
    if (client) {
      this.client = client;
    } else {
      this.client = new S3Client({
        region: env.AWS_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials:
          env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
        forcePathStyle: !!env.S3_ENDPOINT, // Required for LocalStack / MinIO
      });
    }
  }

  async put(input: PutObjectInput): Promise<PutObjectOutput> {
    const bucket = this.defaultBucket;
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );

    return {
      key: input.key,
      bucket,
    };
  }

  async resolve(doc: ResolveDocInput): Promise<ResolveDocOutput> {
    const bucket = doc.bucket || this.defaultBucket;

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: doc.storageKey,
        }),
      );
    } catch (err: unknown) {
      const s3Err = err as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
        Code?: string;
      };
      if (
        s3Err.$metadata?.httpStatusCode === 404 ||
        s3Err.$metadata?.httpStatusCode === 403 ||
        s3Err.name === "NotFound" ||
        s3Err.Code === "AccessDenied"
      ) {
        throw new NotFoundError(
          `Document file '${doc.storageKey}' not found in S3 bucket`,
        );
      }
      throw err;
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: doc.storageKey,
      ResponseContentType: doc.mimeType,
      ResponseContentDisposition: "inline",
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 300 }); // 5 minutes
    return {
      kind: "redirect",
      url,
    };
  }

  async remove(doc: RemoveDocInput): Promise<void> {
    const bucket = doc.bucket || this.defaultBucket;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: doc.storageKey,
      }),
    );
  }
}
