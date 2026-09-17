/**
 * lib/api/documents.ts — Document upload and retrieval API methods.
 */
import { apiClient } from "@repo/ui";
import type { DocumentDto } from "@repo/types";

export const documentsApi = {
  upload: (file: File, docType: "SALARY_SLIP") => {
    const form = new FormData();
    form.append("file", file);
    form.append("docType", docType);
    return apiClient.upload<{ document: DocumentDto }>("/documents", form);
  },
};
