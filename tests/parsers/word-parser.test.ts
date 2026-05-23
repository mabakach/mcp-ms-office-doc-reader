import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock("../../src/utils/file-validation.js", () => ({
  validateReadOnlyAccess: vi.fn(),
}));

import mammoth from "mammoth";
import { validateReadOnlyAccess } from "../../src/utils/file-validation.js";
import { parseWordDocument } from "../../src/parsers/word-parser.js";

const mockExtractRawText = vi.mocked(mammoth.extractRawText);
const mockValidate = vi.mocked(validateReadOnlyAccess);

describe("parseWordDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue("/resolved/test.docx");
  });

  it("passes the resolved path to mammoth", async () => {
    mockExtractRawText.mockResolvedValue({ value: "text", messages: [] });
    await parseWordDocument("/input/test.docx");
    expect(mockExtractRawText).toHaveBeenCalledWith({ path: "/resolved/test.docx" });
  });

  it("returns the extracted text", async () => {
    mockExtractRawText.mockResolvedValue({ value: "Hello world", messages: [] });
    const result = await parseWordDocument("/test.docx");
    expect(result).toBe("Hello world");
  });

  it("trims leading and trailing whitespace", async () => {
    mockExtractRawText.mockResolvedValue({ value: "  content  \n\n", messages: [] });
    const result = await parseWordDocument("/test.docx");
    expect(result).toBe("content");
  });

  it("appends warnings section when mammoth reports warnings", async () => {
    mockExtractRawText.mockResolvedValue({
      value: "Document text",
      messages: [
        { type: "warning", message: "Unknown element: foo" },
        { type: "warning", message: "Unsupported style" },
      ],
    });
    const result = await parseWordDocument("/test.docx");
    expect(result).toContain("Document text");
    expect(result).toContain("---");
    expect(result).toContain("Warnings:");
    expect(result).toContain("Unknown element: foo");
    expect(result).toContain("Unsupported style");
  });

  it("does not append warnings section when there are no warnings", async () => {
    mockExtractRawText.mockResolvedValue({ value: "Clean text", messages: [] });
    const result = await parseWordDocument("/test.docx");
    expect(result).not.toContain("Warnings:");
  });

  it("propagates validation errors", async () => {
    mockValidate.mockRejectedValue(new Error("Unsupported file type"));
    await expect(parseWordDocument("/bad.txt")).rejects.toThrow("Unsupported file type");
    expect(mockExtractRawText).not.toHaveBeenCalled();
  });
});
