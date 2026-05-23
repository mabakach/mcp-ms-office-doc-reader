import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-pptx")),
  access: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("../../src/utils/file-validation.js", () => ({
  validateReadOnlyAccess: vi.fn(),
}));

const { mockLoadAsync } = vi.hoisted(() => ({ mockLoadAsync: vi.fn() }));
vi.mock("jszip", () => ({
  default: { loadAsync: mockLoadAsync },
}));

import { validateReadOnlyAccess } from "../../src/utils/file-validation.js";
import {
  parsePowerPointDocument,
  extractTextFromSlide,
  decodeXmlEntities,
} from "../../src/parsers/powerpoint-parser.js";

const mockValidate = vi.mocked(validateReadOnlyAccess);

// ── decodeXmlEntities ─────────────────────────────────────────────────────────

describe("decodeXmlEntities", () => {
  it.each([
    ["&amp;", "&"],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", '"'],
    ["&apos;", "'"],
  ])("decodes %s → %s", (input, expected) => {
    expect(decodeXmlEntities(input)).toBe(expected);
  });

  it("decodes multiple entities in one string", () => {
    expect(decodeXmlEntities("&lt;tag attr=&quot;val&quot;&gt;")).toBe('<tag attr="val">');
  });

  it("leaves plain text unchanged", () => {
    expect(decodeXmlEntities("Hello world")).toBe("Hello world");
  });
});

// ── extractTextFromSlide ──────────────────────────────────────────────────────

describe("extractTextFromSlide", () => {
  it("extracts text from a single text run", () => {
    const xml = "<a:p><a:r><a:t>Hello</a:t></a:r></a:p>";
    expect(extractTextFromSlide(xml)).toBe("Hello");
  });

  it("joins multiple text runs in one paragraph without separator", () => {
    const xml = "<a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>world</a:t></a:r></a:p>";
    expect(extractTextFromSlide(xml)).toBe("Hello world");
  });

  it("separates paragraphs with newlines", () => {
    const xml = "<a:p><a:t>Line 1</a:t></a:p><a:p><a:t>Line 2</a:t></a:p>";
    expect(extractTextFromSlide(xml)).toBe("Line 1\nLine 2");
  });

  it("skips empty paragraphs", () => {
    const xml = "<a:p></a:p><a:p><a:t>Text</a:t></a:p><a:p></a:p>";
    expect(extractTextFromSlide(xml)).toBe("Text");
  });

  it("decodes XML entities inside text nodes", () => {
    const xml = "<a:p><a:t>A &amp; B &lt; C</a:t></a:p>";
    expect(extractTextFromSlide(xml)).toBe("A & B < C");
  });

  it("returns empty string when no text nodes exist", () => {
    expect(extractTextFromSlide("<p:sp><p:nvSpPr/></p:sp>")).toBe("");
  });

  it("handles paragraph with attributes on <a:p>", () => {
    const xml = '<a:p a:foo="bar"><a:t>Content</a:t></a:p>';
    expect(extractTextFromSlide(xml)).toBe("Content");
  });
});

// ── parsePowerPointDocument ───────────────────────────────────────────────────

function makeZip(slides: Record<string, string>) {
  const files: Record<string, { async: () => Promise<string> }> = {};
  for (const [name, xml] of Object.entries(slides)) {
    files[name] = { async: () => Promise.resolve(xml) };
  }
  return { files };
}

describe("parsePowerPointDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue("/resolved/deck.pptx");
  });

  it("returns slide text in order", async () => {
    mockLoadAsync.mockResolvedValue(
      makeZip({
        "ppt/slides/slide1.xml": "<a:p><a:t>First slide</a:t></a:p>",
        "ppt/slides/slide2.xml": "<a:p><a:t>Second slide</a:t></a:p>",
      })
    );
    const result = await parsePowerPointDocument("/deck.pptx");
    expect(result).toContain("=== Slide 1 ===\nFirst slide");
    expect(result).toContain("=== Slide 2 ===\nSecond slide");
    // Slide 1 must appear before slide 2
    expect(result.indexOf("Slide 1")).toBeLessThan(result.indexOf("Slide 2"));
  });

  it("returns '(no text)' for a slide with no text nodes", async () => {
    mockLoadAsync.mockResolvedValue(
      makeZip({ "ppt/slides/slide1.xml": "<p:sp/>" })
    );
    const result = await parsePowerPointDocument("/deck.pptx");
    expect(result).toContain("(no text)");
  });

  it("returns '(no slides found)' for a presentation with no slides", async () => {
    mockLoadAsync.mockResolvedValue(makeZip({}));
    const result = await parsePowerPointDocument("/deck.pptx");
    expect(result).toBe("(no slides found)");
  });

  it("ignores non-slide files inside the ZIP", async () => {
    mockLoadAsync.mockResolvedValue(
      makeZip({
        "ppt/slides/slide1.xml": "<a:p><a:t>Real slide</a:t></a:p>",
        "ppt/slides/_rels/slide1.xml.rels": "<rels/>",
        "docProps/app.xml": "<app/>",
      })
    );
    const result = await parsePowerPointDocument("/deck.pptx");
    expect(result).toContain("Slide 1");
    expect(result).not.toContain("Slide 2");
  });

  it("propagates validation errors", async () => {
    mockValidate.mockRejectedValue(new Error("File too large"));
    await expect(parsePowerPointDocument("/huge.pptx")).rejects.toThrow("File too large");
    expect(mockLoadAsync).not.toHaveBeenCalled();
  });
});
