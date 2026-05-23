import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseWordDocument } from "./parsers/word-parser.js";
import { parseExcelDocument, listExcelSheets } from "./parsers/excel-parser.js";
import { parsePowerPointDocument } from "./parsers/powerpoint-parser.js";

const server = new McpServer({
  name: "ms-office-doc-reader",
  version: "0.1.0",
});

const filePathSchema = { file_path: z.string().describe("Absolute path to the document file") };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ── Word ──────────────────────────────────────────────────────────────────────

server.registerTool(
  "read_word_document",
  {
    description:
      "Read the full text content of a Word document (.docx). Preserves paragraph structure.",
    inputSchema: filePathSchema,
  },
  async ({ file_path }) => {
    try {
      const text = await parseWordDocument(file_path);
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

// ── Excel ─────────────────────────────────────────────────────────────────────

server.registerTool(
  "list_excel_sheets",
  {
    description: "List all sheet names in an Excel workbook (.xlsx, .xls, .xlsm).",
    inputSchema: filePathSchema,
  },
  async ({ file_path }) => {
    try {
      const sheets = await listExcelSheets(file_path);
      return { content: [{ type: "text", text: sheets.join("\n") }] };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

server.registerTool(
  "read_excel_document",
  {
    description:
      "Read an Excel workbook (.xlsx, .xls, .xlsm) as CSV. Reads all sheets unless sheet_name is given.",
    inputSchema: {
      ...filePathSchema,
      sheet_name: z
        .string()
        .optional()
        .describe("Name of the specific sheet to read (omit to read all sheets)"),
    },
  },
  async ({ file_path, sheet_name }) => {
    try {
      const text = await parseExcelDocument(file_path, sheet_name);
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

// ── PowerPoint ────────────────────────────────────────────────────────────────

server.registerTool(
  "read_powerpoint_document",
  {
    description:
      "Read the text content of a PowerPoint presentation (.pptx), slide by slide.",
    inputSchema: filePathSchema,
  },
  async ({ file_path }) => {
    try {
      const text = await parsePowerPointDocument(file_path);
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

// ── Boot ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
