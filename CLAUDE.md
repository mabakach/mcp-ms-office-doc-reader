# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

An MCP (Model Context Protocol) server that enables AI assistants to read Microsoft Office documents. It is strictly **read-only** — writing to documents is not supported and must never be added.

Supported formats:
- Word `.docx` (primary focus) — via `mammoth`
- Excel `.xlsx / .xls / .xlsm` — via `xlsx` (SheetJS)
- PowerPoint `.pptx` — via `jszip` + regex extraction from slide XML

## Common Commands

```bash
yarn             # install dependencies
yarn build       # compile TypeScript → dist/
yarn dev         # run directly via tsx (no build needed)
yarn start       # run compiled dist/index.js
yarn typecheck   # type-check without emitting
yarn test        # run unit tests (vitest)
yarn test:watch  # vitest in watch mode
```

## Architecture

```
src/
  index.ts              # MCP server entry point — registers all tools
  parsers/
    word-parser.ts      # mammoth.extractRawText → plain text
    excel-parser.ts     # XLSX.readFile → CSV per sheet
    powerpoint-parser.ts # jszip unpack + regex on <a:t> XML nodes
  utils/
    file-validation.ts  # path.resolve + extension + R_OK + 50 MB size guard
  types/
    mammoth.d.ts        # local type declaration (no @types/mammoth on npm)
tests/
  utils/
    file-validation.test.ts
  parsers/
    word-parser.test.ts
    excel-parser.test.ts
    powerpoint-parser.test.ts
```

### MCP Tools exposed

| Tool | Input | Purpose |
|------|-------|---------|
| `read_word_document` | `file_path` | Full text of a `.docx` |
| `list_excel_sheets` | `file_path` | Sheet names in a workbook |
| `read_excel_document` | `file_path`, `sheet_name?` | CSV of one or all sheets |
| `read_powerpoint_document` | `file_path` | Text per slide of a `.pptx` |

All tools return `{ content: [{ type: "text", text: "..." }] }`. Errors are returned as `isError: true` responses rather than thrown exceptions.

### Key implementation notes

- Use `server.registerTool()` (not the deprecated `server.tool()`).
- Zod **v4** is required — the MCP SDK bundles Zod v4 internally, so using v3 causes `ZodRawShapeCompat` type mismatches.
- `validateReadOnlyAccess` returns the resolved absolute path; parsers must use this returned value for all I/O, never the original input path.
- File validation: wrong extension → error, file missing/unreadable → error, is-directory → error, >50 MB → error.
- PowerPoint slide order is determined by the numeric suffix in `ppt/slides/slideN.xml` filenames.
- `extractTextFromSlide` and `decodeXmlEntities` (PowerPoint), and `formatSheet` (Excel) are exported for unit testing. Parser mocks use `vi.hoisted()` for variables referenced inside `vi.mock()` factories.

## Claude Desktop Registration

```json
{
  "mcpServers": {
    "ms-office-doc-reader": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```
