import {
  DocumentModel,
  type IDocument,
  type IDocumentDocument,
} from "@/models/index.js";
import type { DocumentType } from "@repo/types";

export class DocumentRepository {
  async create(data: {
    ownerUserId: string;
    docType: DocumentType;
    provider: IDocument["provider"];
    storageKey: string;
    bucket: string | null;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<IDocumentDocument> {
    return DocumentModel.create(data);
  }

  async findById(id: string): Promise<IDocumentDocument | null> {
    return DocumentModel.findById(id).exec();
  }

  async findByOwner(
    ownerUserId: string,
    docType?: DocumentType,
  ): Promise<IDocumentDocument[]> {
    const filter: { ownerUserId: string; docType?: DocumentType } = {
      ownerUserId,
    };
    if (docType) {
      filter.docType = docType;
    }
    return DocumentModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async deleteById(id: string): Promise<IDocumentDocument | null> {
    return DocumentModel.findByIdAndDelete(id).exec();
  }
}

export const documentRepository = new DocumentRepository();
