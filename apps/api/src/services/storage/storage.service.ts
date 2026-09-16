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

  constructor(customDriver?: StorageDriver) {
    if (customDriver) {
      this.driver = customDriver;
    } else if (env.STORAGE_DRIVER === "s3") {
      this.driver = new S3StorageDriver();
    } else {
      this.driver = new LocalStorageDriver();
    }
  }

  getDriver(): StorageDriver {
    return this.driver;
  }

  async put(input: PutObjectInput): Promise<PutObjectOutput> {
    return this.driver.put(input);
  }

  async resolve(doc: ResolveDocInput): Promise<ResolveDocOutput> {
    return this.driver.resolve(doc);
  }

  async remove(doc: RemoveDocInput): Promise<void> {
    return this.driver.remove(doc);
  }
}

export const storageService = new StorageService();
