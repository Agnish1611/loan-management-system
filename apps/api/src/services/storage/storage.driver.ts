import type { Readable } from "stream";
import type { StorageProvider } from "@repo/types";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  mimeType: string;
}

export interface PutObjectOutput {
  key: string;
  bucket: string | null;
}

export interface ResolveDocInput {
  provider: StorageProvider;
  bucket: string | null;
  storageKey: string;
  mimeType: string;
}

export type ResolveDocOutput =
  { kind: "stream"; stream: Readable } | { kind: "redirect"; url: string };

export interface RemoveDocInput {
  bucket: string | null;
  storageKey: string;
}

export interface StorageDriver {
  readonly provider: StorageProvider;
  put(input: PutObjectInput): Promise<PutObjectOutput>;
  resolve(doc: ResolveDocInput): Promise<ResolveDocOutput>;
  remove(doc: RemoveDocInput): Promise<void>;
}
