# SmartDrive

A personal, serverless PWA for capturing, uploading, tagging and organizing screenshots and files.
Everything (files + metadata) is stored in a **`SmartDrive`** folder in your Google Drive. There is no backend.

- **Capture:** paste (Ctrl/Cmd+V), drag & drop, the bottom-right upload menu (Screenshot on desktop, Camera, Upload document), or the Android share sheet (installed PWA).
- **Metadata:** tags, device label → Drive `appProperties`; comments → Drive `description`.
- **Organize:** tag chips (AND), "Untagged" inbox, and text search over name + comment.
- **Edit:** change tags/comment, replace the file (metadata kept), download, open in Drive, trash.

## Stack
Vite + React 19 (JavaScript) + Material UI (MUI v7) + `vite-plugin-pwa` (custom service worker) + Google Identity Services + Drive REST v3.

## Google Cloud setup
1. Create a project at <https://console.cloud.google.com/>.
2. **APIs & Services → Library →** enable **Google Drive API**.
3. **OAuth consent screen:** External, add yourself as a test user, add scope `https://www.googleapis.com/auth/drive.file`.
4. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:4173` (preview) and your production origin (HTTPS).
5. Copy `.env.local.example` to `.env.local` and set:
   ```env
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```

## Commands
```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # production bundle + service worker in dist/
npm run preview  # serve dist/ on http://localhost:4173
```

## Share sheet (Android)
The manifest declares a `share_target` (`POST /share-target`, `multipart/form-data`). The service worker (`src/sw.js`)
stores shared files in IndexedDB and redirects to `/?shared=1`, which opens the upload modal pre-filled.

1. Deploy over HTTPS (or use a tunnel) and add that origin to the OAuth client.
2. Open the site in Chrome on Android → **Install app**.
3. Share an image from Gallery/Photos → choose **SmartDrive**.

iOS Safari doesn't support `share_target`; on iOS use the Upload button (photo library) or paste.

## Data model
| Drive field | Use |
| --- | --- |
| `name` | Original filename, or `YYYY-MM-DD_HH-mm-ss.<ext>` for clipboard images |
| `parents` | `[SmartDrive folder id]` (cached in `localStorage`) |
| `description` | Comment / notes |
| `appProperties.tags` | comma-separated lowercase slugs (124-byte limit enforced in the UI) |
| `appProperties.deviceLabel` | `iOS`, `Android`, `Windows`, `macOS`, … |

## Project layout
```
src/
  sw.js                 service worker (precache + share target)
  lib/                  auth (GIS), drive (REST client), tags, filename, device, capture, shareInbox
  hooks/                useAuth, useVaultFiles, useFilters, usePasteAndDrop, useAuthedImage, useObjectUrlRef
  components/           Vault, Header, FilterBar, FileCard, UploadModal, EditPanel, TagInput, …
```
