import fs from "fs";
import path from "path";
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

export class LocalStorageDriver implements StorageDriver {
  readonly provider = "LOCAL" as const;
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir
      ? path.resolve(baseDir)
      : path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
  }

  async put(input: PutObjectInput): Promise<PutObjectOutput> {
    const fullPath = path.join(this.baseDir, input.key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, input.body);
    return {
      key: input.key,
      bucket: null,
    };
  }

  async resolve(doc: ResolveDocInput): Promise<ResolveDocOutput> {
    const fullPath = path.join(this.baseDir, doc.storageKey);
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new NotFoundError("File not found on local storage");
    }

    const stream = fs.createReadStream(fullPath);
    return {
      kind: "stream",
      stream,
    };
  }

  async remove(doc: RemoveDocInput): Promise<void> {
    const fullPath = path.join(this.baseDir, doc.storageKey);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // Silently ignore if file doesn't exist
    }
  }
}
