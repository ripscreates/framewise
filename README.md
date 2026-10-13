# Framewise

Framewise is a friendly, step-by-step guide to building FFmpeg commands and processing media in the browser.

## What’s here

- Guided workflows for compressing, converting, trimming, extracting audio, resizing, subtitles, and GIFs.
- A clickable step flow where you can choose, skip, and revisit options.
- Drag-and-drop file and folder selection, including batch workflows.
- A command review with a copyable desktop FFmpeg command and an in-browser run option.
- Browser-local run history with search and repeat.
- Help content explaining the workflow and browser processing limits.

## Project status

For the current snapshot, known gaps, and recommended next steps, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Current AI behavior

The natural-language helper currently uses local keyword matching in `src/lib/intent.ts`. It does not call an AI model or require an API key. A real AI integration is still outstanding.

## File handling and privacy

Conversion runs in the browser with FFmpeg WebAssembly. The FFmpeg engine is loaded on the first run from the public unpkg CDN (about 31 MB); selected media files are processed in the browser and are not uploaded by this app. History is stored in local browser storage. Output files are saved to a chosen folder where the browser supports it, or downloaded individually.

## Run locally

The source includes a Bun lockfile, but its original `bunfig.toml` was omitted: security review blocked a setting in that file because it exempts four packages from Bun’s 24-hour dependency-age guard. Reintroduce a Bun configuration only after choosing an approved dependency-age policy. npm is also available with a current Node.js installation:

```sh
npm install
npm run dev
```

The app runs as a local development server. Use `bun run build` or `npm run build` to create a production build.

## Before release

- Add an actual AI service if model-powered intent handling is required, including a secure server-side integration and a clear privacy policy for any prompts sent to it.
- Run an end-to-end conversion with representative files and verify folder saving and download fallback in supported browsers.
- Review the Lovable-provided TanStack/Vite configuration if this repository will be maintained independently of Lovable.
- Confirm deployment and hosting requirements for the browser FFmpeg engine.

The GitHub recreation omits the source project's test suite and test-runner configuration. No build, test, or conversion was run as part of this repository copy.
