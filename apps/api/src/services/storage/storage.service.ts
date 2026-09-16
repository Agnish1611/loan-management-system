import { env } from "@/config/index.js";
import { LocalStorageDriver } from "@/services/storage/local.driver.js";
import { S3StorageDriver } from "@/services/storage/s3.driver.js";
import type {
  StorageDriver,
  PutObjectInput,
  PutObjectOutput,
  ResolveDocInput,
  ResolveDocOutput,
  RemoveDocInput,
} from "@/services/storage/storage.driver.js";

export class StorageService {
  private driver: StorageDriver;
  private customDriver?: StorageDriver;
  private localDriver: LocalStorageDriver;
  private s3Driver?: S3StorageDriver;

  constructor(customDriver?: StorageDriver) {
    this.localDriver = new LocalStorageDriver();
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      this.s3Driver = new S3StorageDriver();
    }

    if (customDriver) {
      this.customDriver = customDriver;
      this.driver = customDriver;
    } else if (env.STORAGE_DRIVER === "s3") {
      this.driver = this.s3Driver ?? new S3StorageDriver();
    } else {
      this.driver = this.localDriver;
    }
  }

  getDriver(): StorageDriver {
    return this.driver;
  }

  async put(input: PutObjectInput): Promise<PutObjectOutput> {
    return this.driver.put(input);
  }

  async resolve(doc: ResolveDocInput): Promise<ResolveDocOutput> {
    if (this.customDriver) {
      return this.customDriver.resolve(doc);
    }

    // Try target provider first, with seamless fallback if file exists in the other provider
    if (doc.provider === "S3") {
      const s3 = this.s3Driver ?? new S3StorageDriver();
      try {
        return await s3.resolve(doc);
      } catch (s3Err) {
        try {
          return await this.localDriver.resolve(doc);
        } catch {
          throw s3Err;
        }
      }
    }

    if (doc.provider === "LOCAL") {
      try {
        return await this.localDriver.resolve(doc);
      } catch (localErr) {
        if (this.s3Driver) {
          try {
            return await this.s3Driver.resolve(doc);
          } catch {
            throw localErr;
          }
        }
        throw localErr;
      }
    }

    return this.driver.resolve(doc);
  }

  async remove(doc: RemoveDocInput): Promise<void> {
    if (this.customDriver) {
      return this.customDriver.remove(doc);
    }

    if (doc.bucket && this.s3Driver) {
      try {
        await this.s3Driver.remove(doc);
      } catch {
        // Ignore
      }
    }
    try {
      await this.localDriver.remove(doc);
    } catch {
      // Ignore
    }
  }
}

export const storageService = new StorageService();
