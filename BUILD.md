# Building Sonance

## Run it
- **Web dev:** `npm run dev` → http://localhost:5173
- **Desktop dev:** `npm run electron:dev` (Vite + Electron, hot reload)

## Desktop builds
- **`npm run electron:build`** → `tsc -b` + `vite build` + `electron-builder`.
  - Produces the **runnable app** at `release/win-unpacked/Sonance.exe` (just run it — no install).
  - Then tries to package a one-click **NSIS installer** at `release/Sonance Setup <ver>.exe`.

### The installer needs Windows Developer Mode (one-time)
electron-builder extracts a `winCodeSign` toolset whose archive contains macOS symlinks. Creating symlinks
on Windows needs a privilege a normal shell lacks, so the installer step fails with:
`Cannot create symbolic link : A required privilege is not held by the client`.

**Fix (persistent, set once):** Settings → Privacy & Security → **For Developers → Developer Mode = On**
(or run the build from an **Administrator** terminal). After that, `npm run electron:build` produces the
installer cleanly. The `win-unpacked` app builds fine regardless.

### Shareable without the installer
`powershell Compress-Archive -Path "release/win-unpacked/*" -DestinationPath "release/OrchestralSymphony-win.zip" -Force`
→ a single zip; extract and run `Sonance.exe` inside.

## Icon
The Windows icon is currently the Electron default — electron-builder can't rasterize `public/favicon.svg`
and there's no PNG/ICO yet. Add a 256×256+ `build/icon.ico` (or `.png`) and point `build.win.icon` at it.
