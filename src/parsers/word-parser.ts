import mammoth from "mammoth";
import { validateReadOnlyAccess } from "../utils/file-validation.js";

export async function parseWordDocument(filePath: string): Promise<string> {
  const resolved = await validateReadOnlyAccess(filePath, [".docx"]);
  const result = await mammoth.extractRawText({ path: resolved });

  const warnings = result.messages
    .filter((m) => m.type === "warning")
    .map((m) => m.message);

  const text = result.value.trim();
  return warnings.length > 0
    ? `${text}\n\n---\nWarnings:\n${warnings.join("\n")}`
    : text;
}
