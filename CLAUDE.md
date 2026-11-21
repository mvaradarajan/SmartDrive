# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A personal, serverless Progressive Web App (PWA) for capturing, uploading, organizing, and maintaining screenshots and files with tags and comments, using **Google Drive** as the sole storage and metadata backend.

## Architecture & Tech Stack
- **Frontend:** Vite + React + JavaScript (JSX, no TypeScript) + Material UI (MUI v7, Emotion; theme in `src/theme.js`, icons from `@mui/icons-material`) (100% client-side SPA/PWA, zero custom backend).
- **Storage & Database:** Google Drive REST API v3.
- **Auth:** Google Identity Services (GIS) OAuth 2.0 (client-side token flow).
- **PWA Capabilities:** Web App Manifest with `share_target` (for receiving screenshots/files from Android/iOS Share Sheets) + Service Worker (`vite-plugin-pwa`).

## Google Drive Data Model & Constraints
Do **not** introduce a separate database (Firebase, Supabase, etc.). All state lives in Google Drive:
- **OAuth Scope:** Strictly use `https://www.googleapis.com/auth/drive.file` so the app only accesses files/folders it creates.
- **Root Folder:** On first login, find or create a root folder named `SmartDrive` and cache its `folderId` in `localStorage`. All uploads go into this folder.
- **Metadata Mapping on Drive Files:**
  - `name`: Original filename or auto-generated timestamped name (`YYYY-MM-DD_HH-mm-ss.png`).
  - `parents`: `[rootFolderId]`
  - `description`: Stores the user's primary comment/notes (and/or JSON-serialized comment history if multiple notes are needed).
  - `appProperties` (max 124 bytes per key+value pair; keep compact!):
    - `tags`: Comma-separated lowercase slug string (e.g., `"receipt,ui,bug"`).
    - `deviceLabel`: Short device/OS identifier (e.g., `"iOS"`, `"Android"`, `"Windows"`, `"macOS"`).
- **Uploads:** Use `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` to upload file binary + JSON metadata in a single request.
- **Queries:** Filter using Drive's `q` parameter (e.g., `'<rootFolderId>' in parents and trashed = false and appProperties has { key='deviceLabel' and value='iOS' }`). Always request `fields=files(id,name,mimeType,thumbnailLink,webViewLink,createdTime,description,appProperties)` when listing files.

## Core Functional Requirements
1. **Frictionless Capture:**
   - **Desktop/Web:** Global `window` `paste` event listener (`Ctrl+V` / `Cmd+V`) to immediately stage clipboard images, plus drag-and-drop file upload.
   - **Mobile/Tablet:** Configure `manifest.webmanifest` `share_target` (`POST`, `multipart/form-data`) intercepted by the Service Worker to pass shared images/files directly into the "New Upload" modal.
2. **Maintenance & Filtering:**
   - Filter bar supporting multi-criteria filtering: **Tags** (clickable tag chips), and **Text Search** (matches `name` and `description`).
   - Inline editing (`PATCH /drive/v3/files/{fileId}`) to update tags, comments (`description`), or replace an outdated screenshot file while preserving existing metadata.
   - Support an `"untagged"` quick filter for inbox-style triage.

## Development Commands
- `npm install` — Install dependencies
- `npm run dev` — Start local Vite dev server (ensure `http://localhost:5173` is added to Google Cloud OAuth Authorized JavaScript Origins)
- `npm run build` — Build production bundle + Service Worker (`src/sw.js`, injectManifest)
- `npm run lint` — Run ESLint

## Environment Variables
Required in `.env.local` (never commit actual secrets):
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Coding Conventions & Guardrails
- **Token Expiration Handling:** GIS client-side access tokens expire after 1 hour. Implement automatic silent token refresh or graceful re-auth prompt on `401 Unauthorized` responses from Drive API.
- **Image Thumbnails:** Google Drive `thumbnailLink` URLs require auth or fail due to CORS/rate limits if abused; fetch image blobs via `GET /drive/v3/files/{fileId}?alt=media` with the `Authorization: Bearer <token>` header and render via `URL.createObjectURL()` (remember to revoke object URLs on unmount).
- **Keep `appProperties` Lean:** Google Drive enforces a strict byte limit on `appProperties`. Never store long comments in `appProperties`; always use `description` for comments.
- **Mobile-First UI:** Keep the capture modal minimal (Image preview -> Tag input with autocomplete -> Comment box -> Save button) so mobile share-sheet saves take under 5 seconds.
