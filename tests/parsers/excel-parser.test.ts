import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as XLSXType from "xlsx";

vi.mock("xlsx", () => ({
  readFile: vi.fn(),
  utils: {
    sheet_to_csv: vi.fn(),
  },
}));

vi.mock("../../src/utils/file-validation.js", () => ({
  validateReadOnlyAccess: vi.fn(),
}));

import * as XLSX from "xlsx";
import { validateReadOnlyAccess } from "../../src/utils/file-validation.js";
import {
  listExcelSheets,
  parseExcelDocument,
  formatSheet,
} from "../../src/parsers/excel-parser.js";

const mockReadFile = vi.mocked(XLSX.readFile);
const mockSheetToCsv = vi.mocked(XLSX.utils.sheet_to_csv);
const mockValidate = vi.mocked(validateReadOnlyAccess);

function makeWorkbook(
  sheetNames: string[],
  sheets: Record<string, XLSXType.WorkSheet>
): XLSXType.WorkBook {
  return { SheetNames: sheetNames, Sheets: sheets };
}

describe("listExcelSheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue("/resolved/book.xlsx");
  });

  it("returns sheet names from the workbook", async () => {
    mockReadFile.mockReturnValue(makeWorkbook(["Alpha", "Beta"], {}));
    const result = await listExcelSheets("/book.xlsx");
    expect(result).toEqual(["Alpha", "Beta"]);
  });

  it("passes the resolved path to XLSX.readFile", async () => {
    mockReadFile.mockReturnValue(makeWorkbook([], {}));
    await listExcelSheets("/book.xlsx");
    expect(mockReadFile).toHaveBeenCalledWith("/resolved/book.xlsx", { bookSheets: true });
  });

  it("propagates validation errors", async () => {
    mockValidate.mockRejectedValue(new Error("Unsupported file type"));
    await expect(listExcelSheets("/bad.txt")).rejects.toThrow("Unsupported file type");
  });
});

describe("parseExcelDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue("/resolved/book.xlsx");
    mockSheetToCsv.mockReturnValue("a,b\n1,2");
  });

  it("returns CSV for all sheets when no sheet_name given", async () => {
    mockReadFile.mockReturnValue(
      makeWorkbook(["S1", "S2"], { S1: {} as XLSXType.WorkSheet, S2: {} as XLSXType.WorkSheet })
    );
    const result = await parseExcelDocument("/book.xlsx");
    expect(result).toContain("=== Sheet: S1 ===");
    expect(result).toContain("=== Sheet: S2 ===");
  });

  it("returns CSV for the requested sheet only", async () => {
    mockReadFile.mockReturnValue(
      makeWorkbook(["S1", "S2"], { S1: {} as XLSXType.WorkSheet, S2: {} as XLSXType.WorkSheet })
    );
    mockSheetToCsv.mockReturnValue("col1,col2\nval1,val2");
    const result = await parseExcelDocument("/book.xlsx", "S1");
    expect(result).toBe("col1,col2\nval1,val2");
    expect(result).not.toContain("S2");
  });

  it("throws when the requested sheet does not exist", async () => {
    mockReadFile.mockReturnValue(makeWorkbook(["S1"], { S1: {} as XLSXType.WorkSheet }));
    await expect(parseExcelDocument("/book.xlsx", "Missing")).rejects.toThrow(
      'Sheet "Missing" not found. Available sheets: S1'
    );
  });
});

describe("formatSheet", () => {
  it("returns CSV string produced by sheet_to_csv", () => {
    mockSheetToCsv.mockReturnValue("x,y\n1,2");
    const wb = makeWorkbook(["Data"], { Data: {} as XLSXType.WorkSheet });
    const result = formatSheet(wb, "Data");
    expect(result).toBe("x,y\n1,2");
    expect(mockSheetToCsv).toHaveBeenCalledWith({}, { blankrows: false });
  });

  it("returns '(empty sheet)' when the sheet key is missing", () => {
    const wb = makeWorkbook(["Data"], {});
    const result = formatSheet(wb, "Data");
    expect(result).toBe("(empty sheet)");
  });
});
