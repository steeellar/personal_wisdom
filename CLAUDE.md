# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based intelligent document reader application (PDF 智能阅读器) that supports multiple document formats (PDF, DOCX, MD, TXT) with AI-powered Q&A functionality. The application uses ZhipuAI (GLM-4) for document analysis.

## Common Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start development mode with auto-reload
npm start               # Start Electron directly (equivalent to `electron .`)

# Building
npm run build:mac        # Build macOS DMG
npm run build:win        # Build Windows NSIS installer
npm run build:all        # Build for all platforms

# Setup
npm run setup           # Run setup script for icon generation
node scripts/build-icons.js  # Build application icons
```

## Architecture

### Main Process (main.js)
- Entry point for Electron application
- Handles IPC communication with renderer process
- Manages file system operations and folder scanning
- Security: Uses `contextIsolation: true`, `nodeIntegration: false`

### Preload Script (preload.js)
- Bridge between main and renderer processes using `contextBridge`
- Exposes safe API methods: `selectPDF`, `selectFolder`, `readFile`, `saveAPIKey`, `loadAPIKey`, etc.

### Renderer Process (index.html)
- All frontend logic is embedded as an ES6 module within `<script type="module">`
- Single-file architecture for simplicity
- Uses CDN libraries for PDF.js, Mammoth (DOCX parsing), and Marked (Markdown rendering)

### Key IPC Handlers
- `select-pdf`: File picker for individual PDF files (legacy)
- `select-folder`: Directory picker that recursively scans for supported file types
- `read-file`: Reads file content as Uint8Array
- `save-api-key` / `load-api-key` API Key persistence using Electron's userData directory

## Document Processing

The application supports multi-format document reading with a file tree interface:

- **PDF**: Rendered using PDF.js with enhanced text selection layer
- **DOCX**: Parsed using Mammoth.js to HTML
- **Markdown/Text**: Rendered using Marked.js with custom styling

**Important**: When loading PDF files, always create a new ArrayBuffer copy (`arrayBuffer.buffer.slice(0)`) before passing to PDF.js. The PDF.js worker detaches the buffer after first use, causing "ArrayBuffer at index 0 is already detached" errors on subsequent loads.

### File Caching
- Document contents are cached in memory (`fileContents` object) to avoid repeated file reads
- File tree structure is maintained in `folderStructure` variable

## Development Notes

### PDF.js Integration
- Uses PDF.js 3.11.174 from CDN
- Worker source configured in inline script before loading
- Custom text layer styling for improved selection accuracy

### Styling
- Tailwind CSS via CDN for UI layout
- Custom CSS for file tree, document rendering, and PDF text layers
- Icons are inline SVG for simplicity

### Build Configuration
- Electron Builder configuration in package.json
- Icons in `assets/` directory (`icon.icns`, `icon.ico`, `icon.svg`)
- macOS entitlements in `assets/entitlements.mac.plist`

### Platform Support
- macOS: Title bar style 'default', hardened runtime enabled
- Windows: NSIS installer with one-click disabled
- Minimum Node.js version: 22.0.0 (specified in package.json engines)

# vibe coding hint:
- 你只需要完成代码编写和语法检查即可，不用测试。