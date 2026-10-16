# Framewise

**FFmpeg, made friendly.** Framewise is an early-stage app that turns common media tasks into clear, reviewable FFmpeg steps. Choose what you want to do, adjust the options, then run the conversion in your browser or copy the command for desktop FFmpeg.

> **V1 note:** Framewise was originally built and first tested on an Apple M1 Mac. It is designed to run on other computers with a modern browser, but Windows and Linux have not yet been verified. Please share your operating system and browser with any issue report.

See [project status and remaining validation](PROJECT_STATUS.md) for current gaps and next steps.

## What you can do

- Convert or compress video
- Trim a clip, extract audio, resize for social formats, add subtitles, or make a GIF
- Work with several files and folder selections
- Review and copy the FFmpeg command before running it
- Search browser-local history and repeat a previous setup

The guided “describe what you want” helper uses local keyword matching and presets. It does not call an AI service and does not need an OpenAI API key. The guided workflows cover a useful subset of FFmpeg; they do not expose every FFmpeg option.

## How file processing works

When you choose **Run in browser**, Framewise uses FFmpeg compiled to WebAssembly inside the browser tab. On the first conversion, it downloads the FFmpeg engine (about 31 MB) from [unpkg](https://unpkg.com/); keep an internet connection available for that download. The app does not upload the selected media files. Run history—including file names and sizes, settings, command text, and results—is saved in that browser’s local storage. Clearing site data clears that history.

Browser conversion can be slower than desktop FFmpeg and uses browser memory. The app warns that files above roughly 1.5 GB may exceed available memory. For long, 4K, or larger jobs, use the **Copy command** option with desktop FFmpeg. Subtitle burn-in may also need fonts that are not included in the browser engine.

## Requirements

- A desktop computer running a current version of macOS, Windows, or Linux
- [Git](https://git-scm.com/downloads) to download the source
- The current stable release of [Bun](https://bun.sh/docs/installation) to install the project dependencies and run the app. This repository includes `bun.lock` so Bun can use the project’s saved dependency versions.
- A current desktop browser with WebAssembly and Web Worker support. Chrome, Edge, Firefox, and Safari are suitable starting points.
- An internet connection to clone the repository, install dependencies, and download the browser FFmpeg engine on its first run

**Desktop FFmpeg is optional.** You do not need FFmpeg installed on your computer to convert files in the browser. Install it separately if you want to run copied commands from a terminal. Start at [FFmpeg’s download page](https://ffmpeg.org/download.html) and follow its links for your operating system. After installation, open a new terminal and confirm `ffmpeg -version` works.

Directly saving output to a chosen folder is supported in Chrome and Edge on desktop. Other browsers can download each finished file individually.

## Install and run Framewise

### 1. Install Git and Bun

Install Git from [git-scm.com/downloads](https://git-scm.com/downloads). Install Bun by following the instructions for your operating system at [bun.sh/docs/installation](https://bun.sh/docs/installation).

On macOS or Linux, Bun’s official installer can also be run from Terminal:

```sh
curl -fsSL https://bun.sh/install | bash
```

On Windows, use the PowerShell instructions on Bun’s installation page. After installing, close and reopen the terminal, then check both tools:

```sh
git --version
bun --version
```

If `bun` is reported as an unknown command, reopen the terminal first. Bun’s installation page also has steps for adding Bun to your PATH.

### 2. Download the repository

In Terminal, PowerShell, or your preferred shell, move to the folder where you want the project and run:

```sh
git clone https://github.com/ripscreates/framewise.git
cd framewise
```

The repository is currently private. You need access from the repository owner to clone it; these instructions will work for anyone once the repository is made public.

### 3. Install the saved dependencies

Run this from the `framewise` folder—the folder that contains `package.json` and `bun.lock`:

```sh
bun install --frozen-lockfile
```

Wait for the install to finish. If you see an error saying `package.json` cannot be found, check that the terminal is inside the `framewise` project folder before continuing.

### 4. Start the app

```sh
bun run dev
```

Leave that terminal window open. The terminal prints the local address for the app; open that address in your browser. It is usually `http://localhost:5173`. If that address is already in use, Vite prints a different one—use the address shown in the terminal.

### 5. Try a first conversion

1. Choose a small audio or video file that you are comfortable using as a test.
2. Describe the task or select a workflow such as **Convert**, **Compress**, or **Trim**.
3. Choose or skip the suggested steps until you reach the review screen.
4. Review the command and output name.
5. Choose **Run in browser**. The first run downloads the FFmpeg engine; keep the tab open while it loads and converts.
6. Save the result to a folder in Chrome or Edge, or use the download button. Open the result to confirm it plays as expected.
7. Open **History** to review the completed run. To repeat it, select the task and add the input files again.

To stop the local app, return to the terminal and press **Ctrl+C**.

## Optional: build a production version

From the project folder:

```sh
bun run build
bun run preview
```

The build command prepares the app for hosting. The preview command serves that build on your computer so you can inspect it. The project does not currently include a configured public deployment.

## Troubleshooting

| What you see | What to try |
| --- | --- |
| `package.json` not found | Change into the `framewise` folder, then run the command again. |
| `bun` is not recognized | Close and reopen the terminal. If it still fails, follow Bun’s PATH instructions. |
| FFmpeg engine fails to load | Check your internet connection and allow access to `unpkg.com`, then refresh and try again. |
| Browser cannot save directly to a folder | Use desktop Chrome or Edge, or choose the individual download option. |
| `ffmpeg` is not recognized in your terminal | This affects copied desktop commands only. Install desktop FFmpeg and ensure it is available on your PATH. |
| A large file stops or runs out of memory | Try a smaller file or run the copied command with desktop FFmpeg. |

## Technology and references

- App: React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, Radix UI, and Lucide icons
- Browser processing: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/)
- Desktop media toolkit: [FFmpeg documentation](https://ffmpeg.org/documentation.html), including [commands](https://ffmpeg.org/ffmpeg.html), [filters](https://ffmpeg.org/ffmpeg-filters.html), [codecs](https://ffmpeg.org/ffmpeg-codecs.html), and [formats](https://ffmpeg.org/ffmpeg-formats.html)
- Project tools: [Bun](https://bun.sh/docs), [Git](https://git-scm.com/doc), [React](https://react.dev/learn), [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview), and [Vite](https://vite.dev/guide/)
- [Framewise V1 retrospective PDF](public/v1-retrospective.pdf) — project timeline, interface captures, lessons, and references. The interactive retrospective page is also available at `/v1-retrospective` while the local app is running.

## Feedback

Framewise is a first version and needs more real-world checks across operating systems and browsers. When reporting a problem, include your operating system, browser, the steps you took, and whether you chose browser conversion or a copied desktop command. Please do not attach private media files.

There is no `LICENSE` file yet, so the repository does not currently grant permission to reuse or redistribute its code. A license should be selected before opening the source for public reuse.
