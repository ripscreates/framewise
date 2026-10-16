# Framewise project status

**Updated:** October 16, 2026

## Current snapshot

- The master repository is [ripscreates/framewise](https://github.com/ripscreates/framewise), on `main`. Pull request [#3](https://github.com/ripscreates/framewise/pull/3) was merged on October 14, 2026. The repository is currently private.
- Framewise V1 was originally built on an Apple M1 Mac. It is a React and TypeScript app using TanStack Start/Router, Vite, Tailwind CSS, Radix UI, and Lucide.
- The app guides common workflows for compressing or converting video, trimming, extracting audio, resizing, subtitles, and GIFs. It supports multi-file and folder selection, command review, browser conversion, local run history, and repeating a prior setup.
- The natural-language helper uses local keyword matching and presets. It does not connect to an AI model or require an API key.
- Browser conversions use FFmpeg WebAssembly, loaded from unpkg on the first conversion. Selected media is processed in the browser; the app stores run details such as file names, settings, and command text in browser local storage.
- [README.md](README.md) now documents the Bun-based local install, first conversion, requirements, browser behavior, troubleshooting, and optional desktop FFmpeg setup.
- The V1 retrospective is available as an in-app page and a printable PDF.

## Validation and known gaps

- The original development platform was an M1 Apple Silicon Mac. Windows and Linux support are expected from the web-based design but have not yet been validated on those systems.
- The production build passed on October 16 using the dependencies already present in this checkout. A fresh install from `bun.lock` has not been tested in this environment. A successful build confirms that the app compiles; it does not confirm media conversion.
- A real single-file conversion, a batch conversion, and output saving or download should be checked on a clean machine and in supported browsers.
- Browser FFmpeg is single-threaded and can be slow or run out of memory on large files. The app warns that files over roughly 1.5 GB may be too large for browser memory. Use desktop FFmpeg for larger jobs; subtitle burn-in may require system fonts.
- The repository has no automated test suite or test-runner configuration.
- There is no `LICENSE` file and the repo is private. Select a license and decide whether to make the source public before inviting broad public reuse or distribution.
- No public deployment is configured. Before hosting, verify the FFmpeg WebAssembly CDN loading behavior and choose a hosting target.

## Recommended next steps

1. Complete a fresh install and a small real conversion using the README instructions.
2. Check one batch, folder save, and download fallback in current desktop browsers.
3. Try the setup on Windows and Linux, then update the supported-platform note with what was actually verified.
4. Choose a license and decide whether testers should use a public GitHub repo, a hosted demo, or both.
5. Choose and configure hosting if people should try the app without installing it.
