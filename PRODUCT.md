# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA (desktop and mobile). Android receives files via the Web Share Target; iOS Safari has no `share_target`, so iOS relies on the upload menu and paste.

## Users

The general public: anyone with a Google account who wants to save screenshots, photos and files into their own Drive and find them again. Users are not assumed to be technical, and they arrive without anyone to explain the app to them.

Each user's data lives only in their own Google Drive. There is no shared workspace, and no user can see another user's files.

## Product Purpose

SmartDrive makes keeping records fast and makes finding them again reliable. The main jobs are:

- **Keeping receipts and documents.** Photographing paper or saving PDFs and images as records.
- **Triage and search later.** Sitting down afterwards to tag what's in the Untagged inbox and to find old captures by tag or text.

Success means saving takes only a few seconds, and something saved months ago can still be found in a few seconds. Capture and retrieval carry equal weight. Capture stays minimal, and triage is a first-class flow rather than an afterthought.

## Positioning

SmartDrive has no backend and no database of its own. Files and their metadata (tags, comments, device label) live in a `SmartDrive` folder in the user's own Google Drive. It uses the least-privilege `drive.file` scope, so the app can only see files it created. The user's data stays in an account they already trust and control, and leaving the app takes nothing with it.

## Operating Context

- **Capture sources:** paste (Ctrl/Cmd+V), drag and drop, the upload menu (file picker, in-app camera, screen capture on desktop), and the Android share sheet. All of them feed one queue that a short modal works through (preview → tags → comment → Save). Uploads run in the background.
- **Triage:** the "Untagged" quick filter acts as an inbox. Tags are edited inline, and the file and its metadata are changed through Drive PATCH.
- **Retrieval:** tag chips (AND filter) and text search over name and comment. Filtering runs on the device, over the full file list. Filters live in the URL.
- **Session:** Google Identity Services tokens expire after about an hour. The app refreshes them silently and shows a "Reconnect" prompt when that fails.
- **Offline-ish start:** the file list and thumbnails are cached in IndexedDB, so the grid appears instantly before Drive responds.

## Capabilities and Constraints

- Google Drive REST v3 is the only storage and metadata backend. No separate database is ever introduced.
- OAuth scope is strictly `https://www.googleapis.com/auth/drive.file`.
- `appProperties` has a 124-byte limit per key and value. Tags are compact lowercase slugs. Comments always go in `description`.
- Images are fetched with `alt=media` plus a bearer token and shown through object URLs, never from `thumbnailLink`.
- Terminology: **capture** (any incoming file), **tags**, **comment** (the Drive description), **device label** (iOS / Android / Windows / macOS), **Untagged** (the triage inbox), **SmartDrive folder** (the root Drive folder).
- **Launch path (decided):** a public HTTPS deployment with Google OAuth app verification. The consent screen is currently in Testing with hand-added test users.
- **Open decisions:** the production host and domain, the verification timeline, and the privacy policy and terms pages that verification requires (none exist yet).

## Brand Commitments

- The name is **SmartDrive**. Existing icon assets are in `public/` (`icon.svg`, `icon-maskable.svg`, `favicon.svg`).
- The existing trust copy states that SmartDrive only accesses files it creates (`drive.file`). Keep that claim accurate and visible wherever sign-in happens.
- No voice or identity commitments beyond these have been made.

## Evidence on Hand

- Real product facts: the README, ARCHITECTURE.md, and the working capture, triage and search flows in `src/`.
- None of the following exist yet: users, testimonials, usage numbers, press, privacy policy or terms. Do not invent them.

## Product Principles

1. **Capture first, organize when ready.** Saving never waits on organizing. Tags and comments can be added now or during triage later.
2. **The user's Drive, the user's data.** Nothing lives outside their Drive. Never weaken least privilege or add a backend for convenience.
3. **Findable by default.** Every capture should be retrievable later through tags, text or the Untagged inbox. Retrieval matters as much as capture.
4. **Self-explanatory for strangers.** Public users arrive alone, so sign-in, permissions and first use explain themselves and build trust honestly.
5. **Fast on a phone.** A save from the mobile share sheet should complete in under 5 seconds.
