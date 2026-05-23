import * as XLSX from "xlsx";
import { validateReadOnlyAccess } from "../utils/file-validation.js";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".xlsb"];

export async function listExcelSheets(filePath: string): Promise<string[]> {
  const resolved = await validateReadOnlyAccess(filePath, ALLOWED_EXTENSIONS);
  const workbook = XLSX.readFile(resolved, { bookSheets: true });
  return workbook.SheetNames;
}

export async function parseExcelDocument(
  filePath: string,
  sheetName?: string
): Promise<string> {
  const resolved = await validateReadOnlyAccess(filePath, ALLOWED_EXTENSIONS);
  const workbook = XLSX.readFile(resolved);

  if (sheetName !== undefined) {
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(
        `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`
      );
    }
    return formatSheet(workbook, sheetName);
  }

  return workbook.SheetNames.map(
    (name) => `=== Sheet: ${name} ===\n${formatSheet(workbook, name)}`
  ).join("\n\n");
}

export function formatSheet(workbook: XLSX.WorkBook, sheetName: string): string {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return "(empty sheet)";
  return XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
}
