# SyncFav — Cross-Browser Bookmark Sync via Google Drive

> Sync bookmarks effortlessly across **AI Browsers (Ego Lite, Comet, Dia)** & **Chrome / Edge / Brave** — zero browser account lock-in, 100% stored in your own Google Drive.

- **Website**: https://dekury77.github.io/syncFav/
- **Privacy Policy**: https://dekury77.github.io/syncFav/privacy.html
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **License**: [MIT](LICENSE)

---

## Features (`v1.2.0`)

- **Works Without Browser Login**: Uses standard OAuth 2.0 (`launchWebAuthFlow` + PKCE + Refresh Token) instead of Chrome-only `getAuthToken`, so it works seamlessly on **Ego Lite** and any Chromium browser.
- **Minimal Permission (`drive.file`)**: Only accesses its own `SyncFav/bookmarks.json` file in your Google Drive. Never reads other Drive files.
- **Smart 3-Way Merge**: Delete on Computer A and add on Computer B — both changes merge cleanly without duplicates.
- **Failsafe Mass-Deletion Guard**: Automatically pauses sync if more than 30% (and at least 50) bookmarks are about to be deleted at once.
- **Local Auto Backups**: Keeps up to 10 automatic local restore points before applying remote updates, plus JSON export/import.
- **3 Switchable Skins**: Switch instantly between **Obsidian** (Linear dark), **Editorial** (linen & cobalt serif), and **Pro Max** (mint-teal productivity).

## Local Development / Unpacked Install

1. Clone this repository:
   ```bash
   git clone https://github.com/dekury77/syncFav.git
   ```
2. Open `chrome://extensions` in Ego Lite or Chrome → enable **Developer mode**.
3. Click **Load unpacked** and select the `syncFav` folder.
4. Click the SyncFav icon → **Settings** → connect your Google Drive.

## Scripts

```bash
npm test         # Run unit tests (Node built-in test runner)
npm run build:store  # Build Chrome Web Store ZIP (strips local key & dev files)
```
