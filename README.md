# BestPhoto

Free desktop app that finds series of similar photos, lets you star the best shots and copies them out with the folder structure. Runs 100% locally on Windows, macOS and Linux.

**🌐 Website: [bestphoto.artme.dev](https://bestphoto.artme.dev)**

![BestPhoto screenshot](landing/screenshot.jpg)

## ⬇ Download (latest build)

| OS | File |
|---|---|
| Windows (portable, no install) | **[BestPhoto.exe](../../releases/download/latest/BestPhoto.exe)** |
| macOS (Apple Silicon) | **[BestPhoto-mac.dmg](../../releases/download/latest/BestPhoto-mac.dmg)** |
| Linux (any distro) | **[BestPhoto-linux.AppImage](../../releases/download/latest/BestPhoto-linux.AppImage)** |
| Fedora / RHEL / openSUSE | **[BestPhoto-linux.rpm](../../releases/download/latest/BestPhoto-linux.rpm)** |
| Debian / Ubuntu | **[BestPhoto-linux.deb](../../releases/download/latest/BestPhoto-linux.deb)** |

Built automatically by GitHub Actions on every push to `main`.
macOS build is unsigned: after copying to Applications run `xattr -cr /Applications/BestPhoto.app`.
AppImage: `chmod +x BestPhoto-linux.AppImage` before running.

## Features

- Scans a folder or a whole drive and shows folders with photos as a tree.
- Groups similar photos; groups are sorted largest first; saved groups show instantly.
- Similarity methods (any combination, AND / OR, adjustable thresholds):
  dHash, pHash (DCT), color histogram, capture time (EXIF), neural network (CLIP, runs locally, downloaded on request ~90 MB).
- All algorithm scores are computed and saved for every file; shown in the photo info panel with EXIF details.
- Favorites (★, double click, Space/F); folders with favorites are marked as processed.
- Magic mode: favorites every unique photo and one random photo of each similar group in all folders.
- Copies favorites to a new location preserving folder structure (never overwrites or deletes anything).
- Background analysis with ETA; state, feature cache and progress persist between launches.
- UI languages: English, Español, Français, Русский, العربية, 中文.

Keys: ←/→ photo within a group, ↑/↓ group, Space/F toggle favorite.

## Development

```
npm install
npm start      # build UI and run
npm run dist   # build installers for the current OS into release/
```
