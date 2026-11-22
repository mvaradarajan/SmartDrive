# SmartDrive: architecture and design

## What it is
SmartDrive is a web app (installable as a phone or desktop app) that runs entirely in the browser. It saves screenshots and files to your Google Drive and lets you tag, comment on, search and edit them. **There is no backend.** The browser talks directly to Google's sign-in service and the Google Drive API. Drive stores both the files and their metadata.

```
┌──────────────────────────── Browser (React SPA / PWA) ────────────────────────────┐
│                                                                                   │
│  Capture sources            UI layer (components)            Data layer (lib)     │
│  ───────────────            ─────────────────────            ────────────────     │
│  Ctrl+V / drag-drop ─┐      App → LoginScreen | Vault        auth.js (GIS token)  │
│  Upload menu (file,  ├──▶   Vault ─┬─ Header                 drive.js (REST v3) ──┼──▶ Google Drive API
│   camera, screen)    │             ├─ FilterBar              downloadQueue.js     │
│  Share sheet ──▶ sw.js ─▶ IDB ─┘   ├─ FileCard grid          thumbs.js ──▶ IDB    │
│                                    ├─ UploadModal            snapshot.js ─▶ IDB   │
│                                    └─ EditPanel                                   │
│                     hooks: useAuth, useVaultFiles, useFilters, useAuthedImage …   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                     Google Identity Services (OAuth token popup)
```

## Key design decisions
1. **Drive is the database.** Every file lives in one `SmartDrive` folder.
   - The comment goes in the file's Drive `description`.
   - Tags and the device label go in `appProperties`. That's a small key–value field with a 124-byte limit per entry, so `tags.js` enforces the limit.
   - Search and filtering run on the device, over the full file list loaded at startup.
2. **Least-privilege access.** The app asks only for the `drive.file` OAuth scope, so it can see only the files it created itself.
3. **Sign-in happens in the browser.** Google's sign-in library hands the app an access token that expires after an hour.
   - `auth.js` keeps the token in sessionStorage, so it survives a reload but not closing the tab.
   - It refreshes the token silently before it expires.
   - If a request comes back `401`, it gets a fresh token and retries once.
   - If the silent refresh fails, the app shows a "Reconnect" banner.
4. **Capture is the main flow.** Files can come in from five places:
   - pasting (Ctrl+V)
   - drag-and-drop
   - the upload button's menu: file picker, in-app camera, or screen capture
   - the phone's share sheet

   Every source feeds one queue of `File` objects. A short modal (preview → tags → comment → Save) works through the queue one file at a time, and uploads run in the background.
5. **Authenticated images, cached on the device.** Images are downloaded with `alt=media` plus the access token, which keeps them inside the `drive.file` permission. For the grid they're shrunk into small thumbnails stored in IndexedDB. The file list is also saved locally, so the grid appears instantly on the next visit.
6. **State management is deliberately small.** There's no Redux or React Query. Data lives in React hooks (a `useReducer` for files), filters are kept in the URL query string, and auth state lives in a small store read with `useSyncExternalStore`.

## What happens on startup
1. `main.jsx` mounts `<App>` with the MUI theme.
2. `App` checks the sign-in status from `useAuth`:
   - signed out → `LoginScreen`
   - signed in, or token expired → `Vault`
3. `Vault` calls `useVaultFiles`:
   1. It shows the saved file list from IndexedDB right away.
   2. In parallel, it checks the root folder and lists its files, 1000 per page.
   3. It replaces the saved list with the fresh one.
4. Each `FileCard` loads its thumbnail once it scrolls near the screen: memory → IndexedDB → Drive download plus shrinking.

## What happens when you save a capture
Paste, drop, pick, shoot or share → `enqueue(files)` → `UploadModal` → **Save**:
1. The modal moves to the next file straight away.
2. `useVaultFiles.upload` first makes sure the root folder exists (`ensureRootFolder`).
3. `uploadFile` sends the file and its metadata in one request.
4. The new file is put into the thumbnail cache from the copy already on the device, then added to the grid.
5. If the upload fails, the item goes back into the queue with its tags and comment kept.

## What happens with the share sheet
1. Android or iOS sends a `POST /share-target` (declared as `share_target` in the app manifest).
2. `sw.js` intercepts it, stores the files in IndexedDB under `SHARE_KEY`, and redirects to `/?shared=1`.
3. `Vault` reads that stored payload (`takeSharedPayload`) and queues the files.

---

## What each file does

### Root and config
| File | Role |
|---|---|
| `index.html` | HTML page that loads Google's sign-in script and mounts `#root`. |
| `vite.config.js` | Vite + React + `vite-plugin-pwa`. Uses a hand-written service worker (`injectManifest` with `src/sw.js`), defines the app manifest including `share_target`, and has dev-server settings for testing through Cloudflare tunnels. |
| `package.json` | Dependencies: React 19, MUI 7 + Emotion, `idb-keyval`, and the Workbox libraries for the service worker. |
| `.env.local` | Holds `VITE_GOOGLE_CLIENT_ID`. Not committed. |

### Entry and shell
| File | Role |
|---|---|
| `src/main.jsx` | Creates the React root with StrictMode, the MUI `ThemeProvider` and `CssBaseline`. |
| `src/App.jsx` | Chooses `LoginScreen` or `Vault` from the sign-in status. |
| `src/theme.js` | MUI theme: light and dark follow the operating system setting, indigo primary colour, rounded corners, larger tap targets on phones. |
| `src/sw.js` | Service worker. Handles share-sheet POSTs by storing the files in IndexedDB and redirecting, and precaches the app shell so the app loads offline. |

### `src/lib/`: non-UI logic
| File | Role |
|---|---|
| `auth.js` | Google sign-in token handling: `signIn`, `getToken` (silent refresh), `invalidateToken`, `signOut` (revokes the token). Publishes a small status store (`signedOut`, `signedIn`, `expired`). |
| `drive.js` | Drive REST v3 client. `driveFetch` adds the token and retries once on 401. Also has `ensureRootFolder` (find or create the folder, cached and only run once at a time), `listFiles` (pages arrive one by one), `uploadFile` (multipart), `updateMetadata`, `replaceContent`, `downloadBlob`, `trashFile`. |
| `downloadQueue.js` | Download scheduler: up to 6 at a time, newest request first, duplicate requests share one download, and downloads cancel when nobody still wants them. |
| `thumbs.js` | Image caches. `getThumb` checks memory, then IndexedDB, then downloads and shrinks the image. Also `loadOriginal` (full-size copies, kept in memory only), `seedThumb`, `pruneThumbs`, `clearThumbs`, and `revKey` (cache key tied to the content revision). |
| `snapshot.js` | Saves and restores the last file list in IndexedDB for an instant first paint. |
| `tags.js` | Tag rules: tags become lowercase slugs (`parseTags`, `serializeTags`), and the 124-byte limit is checked (`canAddTag`). |
| `filename.js` | Keeps meaningful original names and gives generic ones ("image.png") a `YYYY-MM-DD_HH-mm-ss.ext` name. |
| `device.js` | Works out the `deviceLabel` (iOS, Android, Windows and so on) from the browser's user agent. |
| `capture.js` | Screen capture (`getDisplayMedia`) and camera helpers. `grabFrame` turns a video frame into a `File`. |
| `shareInbox.js` | Reads and clears the share payload the service worker stored, once per page load. |
| `shareKeys.js` | IndexedDB key shared between the service worker and the app. Kept dependency-free so the service worker can import it. |

### `src/hooks/`: React glue
| File | Role |
|---|---|
| `useAuth.js` | Connects `auth.js` to React. On sign-out it also clears the cached root folder, the saved file list and the thumbnails. |
| `useVaultFiles.js` | The file list: a reducer plus `refresh`, `upload`, `update`, `replace` and `trash`. Shows the saved list first, then the fresh one, and saves the list again after changes. |
| `useFilters.js` | Filter state (tags, untagged, search) kept in the URL. `applyFilters` and `collectTags` (tag counts) are pure functions. |
| `useAuthedImage.js` | Gives a component an object URL for a Drive image (`thumb` or `full`). Loads lazily when the element is near the screen, cancels on scroll-away, and releases the URL when it's replaced or unmounted. |
| `usePasteAndDrop.js` | Window-wide paste and drag-and-drop listeners. Returns whether files are being dragged over the window, for the drop overlay. |
| `useObjectUrlRef.js` | Ref-callback for previewing a local `File` in an `<img>`. Uses React 19 ref cleanup to release the URL. |

### `src/components/`: UI
| File | Role |
|---|---|
| `LoginScreen.jsx` | Sign-in screen, plus a warning when the client ID isn't set. |
| `Vault.jsx` | Main screen and coordinator. Owns the upload queue, background uploads, toasts, the open editor, share-sheet intake and the values derived from the file list (tag counts, untagged count, filtered list). Lays out the header, filter bar, grid, upload button, modals and drop overlay. |
| `Header.jsx` | Top bar showing the file count or "Loading…" / "Uploading N…", Refresh and Sign out buttons, and the Reconnect banner when the session has expired. |
| `FilterBar.jsx` | Search box (applied 250ms after you stop typing), an "Untagged" chip and tag chips with counts, and Clear filters. On phones it's one swipeable row. |
| `FileCard.jsx` | Grid card: thumbnail, device badge, name, date, two-line comment preview, and clickable tag chips. |
| `DeviceBadge.jsx` | Small device-label chip shown over the image. |
| `UploadModal.jsx` | Capture dialog (full screen on phones): preview → `TagInput` → comment → Save or Skip. Has "use same tags for next" and shows retry errors. |
| `EditPanel.jsx` | Side drawer for an existing file: preview (thumbnail first, then full size), edit tags and comment, replace the file, download, open in Drive, move to trash. |
| `TagInput.jsx` | MUI Autocomplete for tags: suggestions from existing tags, comma or Enter to add, warns when the 124-byte limit is reached. |
| `UploadSpeedDial.jsx` | Floating upload button with Screenshot (desktop only), Camera and Upload document. Falls back to the native camera through hidden file inputs. |
| `CameraDialog.jsx` | In-app camera: live preview, shutter, front/rear switch. Offers the native camera app if this one fails. |
| `Toasts.jsx` | Shows the newest notification as a Snackbar and keeps it visible during its exit animation. |

`src/assets/*` holds the template images left over from the Vite starter. Only something you import gets bundled.

## Layering in one line
**Components** (what you see) → **hooks** (React state and lifecycle) → **lib** (plain JavaScript: auth, the Drive client, caches, utilities) → **Google sign-in, the Drive API and IndexedDB**. The `lib` files never import React, so they can be reused or tested on their own, and the service worker uses only `shareKeys.js` and `idb-keyval`.
