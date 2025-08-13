# Tauri Desktop App

This folder contains the Tauri configuration for building a native Mac desktop app.

## Prerequisites

1. Install Rust: https://www.rust-lang.org/tools/install
2. Install Tauri CLI: `pnpm add -D @tauri-apps/cli`

## Building the App

### Development
```bash
cd tauri
pnpm tauri dev
```

### Production Build
```bash
cd tauri
pnpm tauri build
```

The built app will be in `tauri/src-tauri/target/release/bundle/`

## Configuration Notes

- The app loads the built web app from `../dist/`
- Window size is set to 1400x900 with minimum 900x600
- The app identifier is `com.agenda.dashboard`
- Icons need to be added to `tauri/icons/` folder

## Icons Setup

Create the following icon files in `tauri/icons/`:
- 32x32.png
- 128x128.png
- 128x128@2x.png (256x256)
- icon.icns (Mac)
- icon.ico (Windows)

You can use `tauri icon` command to generate these from a single 1024x1024 PNG.