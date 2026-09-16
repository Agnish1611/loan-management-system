import type { Request, Response, NextFunction } from "express";
import { documentService, type DocumentService } from "@/services/index.js";
import type { DocumentType } from "@repo/types";

export class DocumentController {
  constructor(private service: DocumentService = documentService) {}

  upload = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const docType = (req.body?.docType as DocumentType) || "SALARY_SLIP";
      const document = await this.service.uploadDocument(
        userId,
        req.file,
        docType,
      );

      res.status(201).json({
        message: "Document uploaded successfully",
        document,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const doc = await this.service.getDocumentById(id, req.user!);

      res.status(200).json({
        document: this.service.formatDocument(doc),
      });
    } catch (err) {
      next(err);
    }
  };

  getContent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { doc, resolution } = await this.service.resolveDocumentContent(
        id,
        req.user!,
      );

      if (resolution.kind === "redirect") {
        res.redirect(302, resolution.url);
        return;
      }

      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(doc.originalFilename)}"`,
      );

      resolution.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const docType = req.query.docType as DocumentType | undefined;
      const documents = await this.service.listMyDocuments(userId, docType);

      res.status(200).json({
        documents,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const documentController = new DocumentController();
