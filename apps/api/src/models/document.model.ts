import { Schema, model, type Document, type Types } from "mongoose";
import {
  DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  type DocumentType,
  type StorageProvider,
} from "@repo/types";

export interface IDocument {
  ownerUserId: Types.ObjectId;
  docType: DocumentType;
  provider: StorageProvider;
  storageKey: string;
  bucket: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentDocument
  extends IDocument, Document<Types.ObjectId> {}

const documentSchema = new Schema<IDocumentDocument>(
  {
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    docType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
      default: "SALARY_SLIP",
    },
    provider: {
      type: String,
      enum: ["LOCAL", "S3"],
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    bucket: {
      type: String,
      default: null,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      enum: ALLOWED_MIME_TYPES,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      max: MAX_DOCUMENT_SIZE_BYTES,
    },
  },
  {
    collection: "documents",
    timestamps: true,
  },
);

documentSchema.index({ ownerUserId: 1, docType: 1, createdAt: -1 });

export const DocumentModel = model<IDocumentDocument>(
  "Document",
  documentSchema,
);
