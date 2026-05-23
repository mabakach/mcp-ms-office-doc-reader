import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { validateReadOnlyAccess } from "../../src/utils/file-validation.js";

describe("validateReadOnlyAccess", () => {
  let tmpDir: string;
  let validDocx: string;
  let subDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mcp-test-"));
    validDocx = join(tmpDir, "doc.docx");
    subDir = join(tmpDir, "subdir");
    await writeFile(validDocx, "dummy content");
    await mkdir(subDir);
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns the resolved absolute path for a valid file", async () => {
    const result = await validateReadOnlyAccess(validDocx, [".docx"]);
    expect(result).toBe(validDocx);
    expect(result.startsWith("/")).toBe(true);
  });

  it("resolves a relative path to an absolute path", async () => {
    // Construct a relative path from cwd
    const relative = require("path").relative(process.cwd(), validDocx);
    const result = await validateReadOnlyAccess(relative, [".docx"]);
    expect(result).toBe(validDocx);
  });

  it("throws for an unsupported file extension", async () => {
    await expect(validateReadOnlyAccess(validDocx, [".xlsx"])).rejects.toThrow(
      'Unsupported file type ".docx"'
    );
  });

  it("includes the allowed extensions in the error message", async () => {
    await expect(
      validateReadOnlyAccess(validDocx, [".xlsx", ".xls"])
    ).rejects.toThrow(".xlsx, .xls");
  });

  it("throws for a non-existent file", async () => {
    const missing = join(tmpDir, "ghost.docx");
    await expect(validateReadOnlyAccess(missing, [".docx"])).rejects.toThrow(
      "File not found or not readable"
    );
  });

  it("throws when the path is a directory", async () => {
    const dirWithExt = join(tmpDir, "dir.docx");
    await mkdir(dirWithExt);
    try {
      await expect(validateReadOnlyAccess(dirWithExt, [".docx"])).rejects.toThrow(
        "Path is not a file"
      );
    } finally {
      await rm(dirWithExt, { recursive: true });
    }
  });

  it("throws when the file exceeds the size limit", async () => {
    const bigFile = join(tmpDir, "big.docx");
    // Write a file slightly above 50 MB
    const MB = 1024 * 1024;
    await writeFile(bigFile, Buffer.alloc(51 * MB));
    try {
      await expect(validateReadOnlyAccess(bigFile, [".docx"])).rejects.toThrow(
        "File too large"
      );
    } finally {
      await rm(bigFile);
    }
  });
});
