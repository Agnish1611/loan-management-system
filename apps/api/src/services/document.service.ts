import { randomUUID } from "crypto";
import path from "path";
import {
  documentRepository,
  type DocumentRepository,
} from "@/repositories/index.js";
import {
  storageService,
  type StorageService,
} from "@/services/storage/index.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/errors/index.js";
import type { IDocumentDocument } from "@/models/index.js";
import {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  type DocumentDto,
  type DocumentType,
  type AllowedMimeType,
  type Role,
} from "@repo/types";

export class DocumentService {
  constructor(
    private docRepo: DocumentRepository = documentRepository,
    private storage: StorageService = storageService,
  ) {}

  async uploadDocument(
    ownerUserId: string,
    file: Express.Multer.File | undefined,
    docType: DocumentType = "SALARY_SLIP",
  ): Promise<DocumentDto> {
    if (!file) {
      throw new BadRequestError("File is required");
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new PayloadTooLargeError("File size exceeds maximum limit of 5 MB");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
      throw new UnsupportedMediaTypeError(
        `Unsupported media type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    const ext =
      path.extname(file.originalname).toLowerCase() ||
      this.mimeToExt(file.mimetype);
    const storageKey = `salary-slips/${ownerUserId}/${randomUUID()}${ext}`;

    // 1. Upload to storage provider
    const putResult = await this.storage.put({
      key: storageKey,
      body: file.buffer,
      mimeType: file.mimetype,
    });

    // 2. Persist metadata in database with compensating rollback on failure
    let doc: IDocumentDocument;
    try {
      doc = await this.docRepo.create({
        ownerUserId,
        docType,
        provider: this.storage.getDriver().provider,
        storageKey: putResult.key,
        bucket: putResult.bucket,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    } catch (dbErr) {
      // Compensating delete if DB write fails
      await this.storage.remove({
        bucket: putResult.bucket,
        storageKey: putResult.key,
      });
      throw dbErr;
    }

    return this.formatDocument(doc);
  }

  async getDocumentById(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<IDocumentDocument> {
    const doc = await this.docRepo.findById(id);
    if (!doc) {
      throw new NotFoundError("Document not found");
    }

    // Role and ownership access control
    this.assertAccess(doc, currentUser);

    return doc;
  }

  async resolveDocumentContent(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<{
    doc: IDocumentDocument;
    resolution: Awaited<ReturnType<StorageService["resolve"]>>;
  }> {
    const doc = await this.getDocumentById(id, currentUser);
    const resolution = await this.storage.resolve({
      provider: doc.provider,
      bucket: doc.bucket,
      storageKey: doc.storageKey,
      mimeType: doc.mimeType,
    });

    return {
      doc,
      resolution,
    };
  }

  async listMyDocuments(
    ownerUserId: string,
    docType?: DocumentType,
  ): Promise<DocumentDto[]> {
    const docs = await this.docRepo.findByOwner(ownerUserId, docType);
    return docs.map((d) => this.formatDocument(d));
  }

  public assertAccess(
    doc: IDocumentDocument,
    currentUser: { id: string; role: Role },
  ): void {
    // Executive roles can access all borrower documents
    if (currentUser.role !== "BORROWER") {
      return;
    }

    // Borrower can only access their own documents
    if (doc.ownerUserId.toString() !== currentUser.id) {
      throw new ForbiddenError("Access denied to this document");
    }
  }

  public formatDocument(doc: IDocumentDocument): DocumentDto {
    return {
      id: doc._id.toString(),
      ownerUserId: doc.ownerUserId.toString(),
      docType: doc.docType,
      provider: doc.provider,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private mimeToExt(mimeType: string): string {
    switch (mimeType) {
      case "application/pdf":
        return ".pdf";
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      default:
        return ".bin";
    }
  }
}

export const documentService = new DocumentService();
