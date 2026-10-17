# Framewise project status

**Updated:** October 17, 2026

## Current snapshot

- The master project is the [ripscreates/framewise repository](https://github.com/ripscreates/framewise). It is still private.
- Framewise V1 was originally built on an Apple M1 Mac. It uses React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, Radix UI, and Lucide.
- The app guides common media tasks such as converting or compressing video, trimming, extracting audio, resizing, adding subtitles, and making GIFs. It supports multiple files and folders, command review, browser conversion, local run history, and repeating a previous setup.
- The natural-language helper uses local keyword matching and presets. It does not connect to an AI model or need an API key.
- Browser conversions use FFmpeg WebAssembly. The pinned core is fetched from unpkg on first use; selected media is processed in the browser, while run details are stored in browser local storage.
- The README documents the Node.js/npm local setup, first conversion, browser behavior, troubleshooting, and optional desktop FFmpeg. The repository uses `package-lock.json` for reproducible npm installs.
- The V1 retrospective is available as an in-app page and printable PDF. A first-use walkthrough was recorded on October 15; it covered resizing, a two-file batch, folder input/output, Help, and repeating a History item.

## Validation and known gaps

- Framewise was built and first tested on Apple M1. Windows and Linux have not yet been verified.
- A clean `npm ci` install from `package-lock.json` and production build both passed on October 17 with Node.js 22.23.1 and npm 10.9.8.
- A GitHub Actions matrix now checks clean installs and production builds on macOS, Linux, and Windows with Node.js 22.12 and 24. Cross-platform results are pending the workflow run; these checks do not replace browser and media-conversion checks on each operating system.
- `npm run lint` currently reports existing Prettier formatting violations across the source tree, so it is not part of the cross-platform build gate.
- Copied desktop commands use POSIX shell quoting. Windows users need Git Bash or WSL; native PowerShell and Command Prompt output is not implemented.
- The first-use walkthrough was a manual check, not a full browser, operating-system, codec, file-size, or accessibility matrix. More real conversion and output checks are still needed.
- Browser FFmpeg can be slow or run out of memory on large files. Files above roughly 1.5 GB may exceed available memory; desktop FFmpeg is the fallback for larger jobs.
- The repository currently has no automated test suite; media conversion still needs focused manual validation.
- The repository has no public deployment. Hosting and distribution of the FFmpeg WebAssembly core need a deliberate review before inviting a wider audience.
- The repository's MIT license applies to original Framewise code and documentation. The browser core has separate upstream licensing; see the README before bundling or redistributing it.

## Recommended next steps

1. Verify a representative media conversion on a clean setup.
2. Check browser conversion, batch output, folder saving, and download fallback in current desktop browsers.
3. Validate Windows and Linux before describing them as tested.
4. Review third-party FFmpeg core terms before public distribution, then decide when to make the repository public.
5. Choose a hosted-demo setup and keep the FFmpeg core's delivery and source notices in view.
6. Collect user feedback through the GitHub issue forms after the repository is public.
7. Use early feedback to shape V2, including a clear, user-controlled FFmpeg engine update check.
