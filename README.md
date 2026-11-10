# BestPhoto

Desktop app (Electron + React) for picking the best shots from series of similar photos.

## ⬇ Download

**[BestPhoto.exe — latest build](../../releases/download/latest/BestPhoto.exe)** (Windows, portable, no install needed)

The exe is built automatically by GitHub Actions on every push to `main`.

## Features

- Scans a folder or a whole drive and shows folders with photos as a tree.
- Groups similar photos in a folder; groups are sorted largest first.
- Similarity methods (any combination, AND / OR, adjustable thresholds):
  dHash, pHash (DCT), color histogram, capture time (EXIF), neural network (CLIP, runs locally; the model ~90 MB is downloaded on first use).
- Mark favorites (★, double click, Space/F); folders with favorites are marked as processed.
- Copies favorites to a new location preserving folder structure (never overwrites or deletes anything).
- Background analysis of all folders; state, favorites, feature cache and analysis progress persist between launches.

Keys: ←/→ photo within a group, ↑/↓ group, Space/F toggle favorite.

## Development

```
npm install
npm start      # build UI and run
npm run dist   # build release/BestPhoto.exe
```
