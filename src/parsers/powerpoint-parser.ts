import JSZip from "jszip";
import { readFile } from "fs/promises";
import { validateReadOnlyAccess } from "../utils/file-validation.js";

export async function parsePowerPointDocument(filePath: string): Promise<string> {
  const resolved = await validateReadOnlyAccess(filePath, [".pptx"]);

  const buffer = await readFile(resolved);
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  if (slideFiles.length === 0) {
    return "(no slides found)";
  }

  const slides = await Promise.all(
    slideFiles.map(async (slideFile, i) => {
      const xml = await zip.files[slideFile].async("text");
      const text = extractTextFromSlide(xml);
      return `=== Slide ${i + 1} ===\n${text || "(no text)"}`;
    })
  );

  return slides.join("\n\n");
}

function slideNumber(filename: string): number {
  return parseInt(filename.match(/(\d+)\.xml$/)?.[1] ?? "0", 10);
}

export function extractTextFromSlide(xml: string): string {
  const paragraphs: string[] = [];
  const paragraphRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;

  let pMatch: RegExpExecArray | null;
  while ((pMatch = paragraphRe.exec(xml)) !== null) {
    const paraXml = pMatch[1];
    const parts: string[] = [];
    const textRe = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

    let tMatch: RegExpExecArray | null;
    while ((tMatch = textRe.exec(paraXml)) !== null) {
      parts.push(decodeXmlEntities(tMatch[1]));
    }

    if (parts.length > 0) {
      paragraphs.push(parts.join(""));
    }
  }

  return paragraphs.join("\n");
}

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
