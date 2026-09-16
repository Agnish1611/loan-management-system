import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import { UserModel, DocumentModel } from "@/models/index.js";
import { authService } from "@/services/index.js";

describe("Document Upload & Storage Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let borrower1Token: string;
  let borrower1Id: string;
  let borrower2Token: string;
  let sanctionToken: string;
  let adminToken: string;

  const testUploadDir = path.resolve(process.cwd(), "uploads");

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
    // Clean up test uploads directory
    try {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
    await UserModel.deleteMany({});

    const b1 = await UserModel.create({
      email: "borrower1@creditsea.com",
      passwordHash: "hash123",
      fullName: "Borrower One",
      role: "BORROWER",
    });
    borrower1Id = b1._id.toString();
    borrower1Token = authService.generateToken(b1);

    const b2 = await UserModel.create({
      email: "borrower2@creditsea.com",
      passwordHash: "hash123",
      fullName: "Borrower Two",
      role: "BORROWER",
    });
    borrower2Token = authService.generateToken(b2);

    const sanction = await UserModel.create({
      email: "sanction@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sanction Officer",
      role: "SANCTION",
    });
    sanctionToken = authService.generateToken(sanction);

    const admin = await UserModel.create({
      email: "admin@creditsea.com",
      passwordHash: "hash123",
      fullName: "Admin User",
      role: "ADMIN",
    });
    adminToken = authService.generateToken(admin);
  });

  describe("POST /api/v1/documents (Upload)", () => {
    it("successfully uploads a PDF salary slip with 201 Created", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 mock pdf content");

      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", pdfBuffer, {
          filename: "payslip-jan-2026.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(201);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.ownerUserId).toBe(borrower1Id);
      expect(res.body.document.docType).toBe("SALARY_SLIP");
      expect(res.body.document.originalFilename).toBe("payslip-jan-2026.pdf");
      expect(res.body.document.mimeType).toBe("application/pdf");
      expect(res.body.document.provider).toBe("LOCAL");
      expect(res.body.document.sizeBytes).toBe(pdfBuffer.length);

      // Verify DB persistence
      const dbDoc = await DocumentModel.findById(res.body.document.id);
      expect(dbDoc).toBeDefined();
      expect(dbDoc?.originalFilename).toBe("payslip-jan-2026.pdf");
    });

    it("successfully uploads PNG and JPEG images with 201 Created", async () => {
      const pngBuffer = Buffer.from("mock png image data");
      const resPng = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", pngBuffer, {
          filename: "salary-statement.png",
          contentType: "image/png",
        });

      expect(resPng.status).toBe(201);
      expect(resPng.body.document.mimeType).toBe("image/png");

      const jpegBuffer = Buffer.from("mock jpeg image data");
      const resJpeg = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", jpegBuffer, {
          filename: "salary-statement.jpg",
          contentType: "image/jpeg",
        });

      expect(resJpeg.status).toBe(201);
      expect(resJpeg.body.document.mimeType).toBe("image/jpeg");
    });

    it("rejects uploads exceeding 5 MB limit with 413 Payload Too Large", async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5 MB + 1 KB

      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", largeBuffer, {
          filename: "oversized.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(413);
      expect(res.body.error).toContain("5 MB");
    });

    it("rejects disallowed MIME types with 415 Unsupported Media Type", async () => {
      const executableBuffer = Buffer.from("malicious binary content");

      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", executableBuffer, {
          filename: "trojan.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(415);
      expect(res.body.error).toContain("Unsupported media type");
    });

    it("rejects request without file attachment with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("File is required");
    });

    it("rejects unauthenticated upload requests with 401 Unauthorized", async () => {
      const res = await request(app)
        .post("/api/v1/documents")
        .attach("file", Buffer.from("pdf"), "file.pdf");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/documents/:id/content (Download & Streaming)", () => {
    let uploadedDocId: string;
    const testContent = "Confidential Salary Slip Content 2026";

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", Buffer.from(testContent), {
          filename: "salary-slip.pdf",
          contentType: "application/pdf",
        });

      uploadedDocId = uploadRes.body.document.id;
    });

    it("allows document owner to stream content with 200 OK", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/content`)
        .set("Authorization", `Bearer ${borrower1Token}`)
        .buffer(true);

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("application/pdf");
      expect(res.header["content-disposition"]).toContain("salary-slip.pdf");
      expect(res.body.toString()).toBe(testContent);
    });

    it("allows SANCTION executive to view borrower salary slip with 200 OK", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/content`)
        .set("Authorization", `Bearer ${sanctionToken}`)
        .buffer(true);

      expect(res.status).toBe(200);
      expect(res.body.toString()).toBe(testContent);
    });

    it("allows ADMIN to view borrower salary slip with 200 OK", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/content`)
        .set("Authorization", `Bearer ${adminToken}`)
        .buffer(true);

      expect(res.status).toBe(200);
      expect(res.body.toString()).toBe(testContent);
    });

    it("blocks other borrowers from accessing document with 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/content`)
        .set("Authorization", `Bearer ${borrower2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Access denied");
    });

    it("returns 404 Not Found for non-existent document", async () => {
      const fakeId = "6639c0b1e4f95a73b5089123";
      const res = await request(app)
        .get(`/api/v1/documents/${fakeId}/content`)
        .set("Authorization", `Bearer ${borrower1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Document not found");
    });
  });

  describe("GET /api/v1/documents/mine (List User Documents)", () => {
    it("lists documents uploaded by the authenticated user", async () => {
      await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", Buffer.from("pdf 1"), {
          filename: "doc1.pdf",
          contentType: "application/pdf",
        });

      await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .attach("file", Buffer.from("pdf 2"), {
          filename: "doc2.pdf",
          contentType: "application/pdf",
        });

      const res1 = await request(app)
        .get("/api/v1/documents/mine")
        .set("Authorization", `Bearer ${borrower1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.documents).toHaveLength(2);

      const res2 = await request(app)
        .get("/api/v1/documents/mine")
        .set("Authorization", `Bearer ${borrower2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.documents).toHaveLength(0);
    });
  });
});
