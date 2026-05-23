# mcp-ms-office-doc-reader

A read-only [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI assistants (Claude Code, Claude Desktop, and other MCP-compatible clients) read the text content of Microsoft Office documents.

**Supported formats:**
- Word `.docx`
- Excel `.xlsx`, `.xls`, `.xlsm`
- PowerPoint `.pptx`

Writing to documents is intentionally not supported.

## Tools

| Tool | Input | Description |
|------|-------|-------------|
| `read_word_document` | `file_path` | Extracts the full text of a `.docx` file, preserving paragraph structure |
| `list_excel_sheets` | `file_path` | Returns all sheet names in an Excel workbook |
| `read_excel_document` | `file_path`, `sheet_name?` | Returns sheet data as CSV; reads all sheets if `sheet_name` is omitted |
| `read_powerpoint_document` | `file_path` | Returns the text of each slide, in order |

All tools require an absolute file path. Files larger than 50 MB are rejected.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Yarn](https://yarnpkg.com) (`npm install -g yarn`)

### 1. Clone and build

```bash
git clone https://github.com/your-username/mcp-ms-office-doc-reader.git
cd mcp-ms-office-doc-reader
yarn
yarn build
```

---

### macOS

**Copy to install location:**

```bash
INSTALL_DIR="$HOME/Library/Application Support/Claude/mcp/ms-office-doc-reader"
mkdir -p "$INSTALL_DIR"
cp -r dist "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cd "$INSTALL_DIR"
yarn install --production
```

**Register with Claude Code:**

```bash
claude mcp add --scope user ms-office-doc-reader $(which node) \
  "$HOME/Library/Application Support/Claude/mcp/ms-office-doc-reader/dist/index.js"
```

> Use the full path to `node` — e.g. `/opt/homebrew/bin/node` on Apple Silicon with Homebrew. Claude Code does not inherit your shell PATH.

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ms-office-doc-reader": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/YOUR_USERNAME/Library/Application Support/Claude/mcp/ms-office-doc-reader/dist/index.js"
      ]
    }
  }
}
```

Replace `YOUR_USERNAME` with your macOS username and adjust the `node` path if needed (`which node`). Restart Claude Desktop after saving.

---

### Linux

**Copy to install location:**

```bash
INSTALL_DIR="$HOME/.local/share/claude/mcp/ms-office-doc-reader"
mkdir -p "$INSTALL_DIR"
cp -r dist "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cd "$INSTALL_DIR"
yarn install --production
```

**Register with Claude Code:**

```bash
claude mcp add --scope user ms-office-doc-reader $(which node) \
  "$HOME/.local/share/claude/mcp/ms-office-doc-reader/dist/index.js"
```

**Claude Desktop** — add to `~/.config/Claude/claude_desktop_config.json` (create the file if it does not exist):

```json
{
  "mcpServers": {
    "ms-office-doc-reader": {
      "command": "/usr/bin/node",
      "args": [
        "/home/YOUR_USERNAME/.local/share/claude/mcp/ms-office-doc-reader/dist/index.js"
      ]
    }
  }
}
```

Replace `YOUR_USERNAME` with your Linux username and adjust the `node` path if needed (`which node`). Restart Claude Desktop after saving.

---

### Windows

Run the following commands in **PowerShell**.

**Copy to install location:**

```powershell
$InstallDir = "$env:APPDATA\Claude\mcp\ms-office-doc-reader"
New-Item -ItemType Directory -Force -Path $InstallDir
Copy-Item -Recurse dist $InstallDir
Copy-Item package.json $InstallDir
Set-Location $InstallDir
yarn install --production
```

**Register with Claude Code:**

```powershell
$NodePath = (Get-Command node).Source
$ServerPath = "$env:APPDATA\Claude\mcp\ms-office-doc-reader\dist\index.js"
claude mcp add --scope user ms-office-doc-reader $NodePath $ServerPath
```

**Claude Desktop** — add to `%APPDATA%\Claude\claude_desktop_config.json` (create the file if it does not exist):

```json
{
  "mcpServers": {
    "ms-office-doc-reader": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\Claude\\mcp\\ms-office-doc-reader\\dist\\index.js"
      ]
    }
  }
}
```

Replace `YOUR_USERNAME` with your Windows username and adjust the `node.exe` path if needed (`(Get-Command node).Source`). Restart Claude Desktop after saving.

---

**Verify the connection (all platforms):**

```bash
claude mcp list
```

You should see `ms-office-doc-reader: ... ✓ Connected`.

## Updating

After pulling new changes, rebuild and copy the updated `dist/` folder to the install location.

**macOS / Linux:**

```bash
yarn build
cp -r dist "$HOME/Library/Application Support/Claude/mcp/ms-office-doc-reader/"
# Linux: cp -r dist "$HOME/.local/share/claude/mcp/ms-office-doc-reader/"
```

**Windows (PowerShell):**

```powershell
yarn build
Copy-Item -Recurse -Force dist "$env:APPDATA\Claude\mcp\ms-office-doc-reader"
```

Then restart your MCP client.

## Development

```bash
yarn dev          # run directly with tsx (no build step)
yarn typecheck    # type-check without emitting
yarn test         # run unit tests
yarn test:watch   # run tests in watch mode
```

## License

MIT — see [LICENSE](LICENSE).
