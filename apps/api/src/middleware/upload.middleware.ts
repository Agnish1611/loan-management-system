import multer from "multer";
import {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  type AllowedMimeType,
} from "@repo/types";
import { UnsupportedMediaTypeError } from "@/errors/index.js";

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
      cb(null, true);
    } else {
      cb(
        new UnsupportedMediaTypeError(
          `Unsupported media type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        ),
      );
    }
  },
});
