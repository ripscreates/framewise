# Framewise project status

**Updated:** October 16, 2026

## Current snapshot

- The master project is the [ripscreates/framewise repository](https://github.com/ripscreates/framewise). It is still private.
- Framewise V1 was originally built on an Apple M1 Mac. It uses React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, Radix UI, and Lucide.
- The app guides common media tasks such as converting or compressing video, trimming, extracting audio, resizing, adding subtitles, and making GIFs. It supports multiple files and folders, command review, browser conversion, local run history, and repeating a previous setup.
- The natural-language helper uses local keyword matching and presets. It does not connect to an AI model or need an API key.
- Browser conversions use FFmpeg WebAssembly. The pinned core is fetched from unpkg on first use; selected media is processed in the browser, while run details are stored in browser local storage.
- The README documents the Bun-based local setup, first conversion, browser behavior, troubleshooting, and desktop FFmpeg option. This release-prep change adds an AI-agent setup prompt, GitHub issue templates, and separate license notices for original project materials and third-party software.
- The V1 retrospective is available as an in-app page and printable PDF. A first-use walkthrough was recorded on October 15; it covered resizing, a two-file batch, folder input/output, Help, and repeating a History item.

## Validation and known gaps

- Framewise was built and first tested on Apple M1. Windows and Linux have not yet been verified.
- The production build passed on October 16 using dependencies already present in the checkout. A fresh install from the Bun lockfile has not been verified.
- The first-use walkthrough was a manual check, not a full browser, operating-system, codec, file-size, or accessibility matrix. More real conversion and output checks are still needed.
- Browser FFmpeg can be slow or run out of memory on large files. Files above roughly 1.5 GB may exceed available memory; desktop FFmpeg is the fallback for larger jobs.
- There is no automated test suite with broad media-workflow coverage.
- The repository has no public deployment. Hosting and distribution of the FFmpeg WebAssembly core need a deliberate review before inviting a wider audience.
- This change proposes MIT for original Framewise code and project documentation. The browser core has separate upstream licensing; see the README before bundling or redistributing it.

## Recommended next steps

1. Verify a fresh Bun install and a representative conversion on a clean setup.
2. Check browser conversion, batch output, folder saving, and download fallback in current desktop browsers.
3. Validate Windows and Linux before describing them as tested.
4. Review the proposed MIT notice and third-party FFmpeg core terms, then decide when to make the repository public.
5. Choose a hosted-demo setup and keep the FFmpeg core's delivery and source notices in view.
6. Collect user feedback through the GitHub issue forms after the repository is public.
7. Use early feedback to shape V2, including a clear, user-controlled FFmpeg engine update check.
