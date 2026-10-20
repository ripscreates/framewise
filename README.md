# Framewise

<p><img src="public/mascot.png" alt="The Framewise mascot — a cheerful purple zigzag inspired by the FFmpeg logo" width="220" /></p>

**TL;DR**
FFmpeg GUI guide to help you get the command line to trim, resize or convert video, audio, & make gifs too!
Runs in your browser; your media stays on your device. 
Keeps track of previous history, to run again later.
Can also process bulk files from folder too!

- To run the web app locally: Node.js (includes npm) and a current desktop browser. Desktop FFmpeg is optional.
- An internet connection is needed to install the app and download its browser FFmpeg engine on first conversion.
- Install desktop FFmpeg only if you want to run copied commands in a terminal.




## Choose an edition

| Edition | Status | What it offers |
| --- | --- | --- |
| **Web app (V1)** | Available to try | Runs locally in a desktop browser on macOS, Windows, and Linux. Browser conversions use FFmpeg WebAssembly; desktop FFmpeg is optional unless you want to run copied commands. |
| **macOS app (V2)** | In development | Apple Silicon is the first planned beta target. There is no supported public Mac download yet. The current prototype has not completed native desktop FFmpeg integration or bundled-engine setup, so it is not yet the all-in-one Mac experience. |

The public default branch currently documents and runs the V1 web app. V2 is being developed separately. Its release checklist includes native FFmpeg execution, a pinned and verified engine, engine compatibility checks, clean-machine conversion testing, and macOS distribution packaging.

**FFmpeg, made friendly.** Framewise is a web app that turns common media tasks into clear, reviewable FFmpeg steps. Choose what you want to do, adjust the options, then run the conversion in your browser or copy the command for desktop FFmpeg.

<p><img src="docs/assets/framewise-create.png" alt="Framewise guided task setup" width="600" /></p>

Framewise's opening screen: guided task setup.


## What you can do

- Convert or compress video
- Trim a clip, extract audio, resize for social formats, add subtitles, or make a GIF
- Work with several files and folder selections
- Review and copy the FFmpeg command before running it
- Search browser-local history and repeat a previous setup

_The guided “describe what you want” helper uses local keyword matching and presets. It does not call an AI service and does not need an OpenAI API key. The guided workflows cover a useful subset of FFmpeg; they do not expose every FFmpeg option._

## How file processing works

When you choose **Run in browser**, Framewise uses FFmpeg compiled to WebAssembly inside the browser tab. On the first conversion, it downloads the FFmpeg engine (about 31 MB) from [unpkg](https://unpkg.com/); keep an internet connection available for that download. The app does not upload the selected media files. Run history—including file names and sizes, settings, command text, and results—is saved in that browser’s local storage. Clearing site data clears that history.

Browser conversion can be slower than desktop FFmpeg and uses browser memory. The app warns that files above roughly 1.5 GB may exceed available memory. For long, 4K, or larger jobs, use the **Copy command** option with desktop FFmpeg. Subtitle burn-in may also need fonts that are not included in the browser engine.

## Requirements

- A desktop computer running a current version of macOS, Windows, or Linux
- [Git](https://git-scm.com/downloads) to download the source
- [Node.js 22.12.0 or newer](https://nodejs.org/en/download). Use a currently supported LTS release; Node.js 24 is the recommended LTS line as of October 2026. Node.js includes npm, which this repository uses to install the exact versions recorded in `package-lock.json`.
- A current desktop browser with WebAssembly and Web Worker support. Chrome, Edge, Firefox, and Safari are suitable starting points.
- An internet connection to clone the repository, install dependencies, and download the browser FFmpeg engine on its first run

**Desktop FFmpeg is optional.** You do not need FFmpeg installed on your computer to convert files in the browser. Install it separately if you want to run copied commands from a terminal. Start at [FFmpeg’s download page](https://ffmpeg.org/download.html) and follow its links for your operating system. After installation, open a new terminal and confirm `ffmpeg -version` works.

Copied desktop commands and downloaded command scripts use POSIX shell syntax. On Windows, run them in Git Bash or WSL; native PowerShell and Command Prompt syntax is not generated yet. This limitation does not affect **Run in browser**.

Directly saving output to a chosen folder is supported in Chrome and Edge on desktop. Other browsers can download each finished file individually.

## Install and run Framewise

### 1. Install Git and Node.js

Install Git from [git-scm.com/downloads](https://git-scm.com/downloads). Install the current Node.js LTS release from [nodejs.org](https://nodejs.org/en/download); npm is included with Node.js.

Close and reopen your terminal after installation, then check that the tools are available:

```sh
git --version
node --version
npm --version
```

Use Node.js 22.12.0 or newer and npm 10 or newer.

### 2. Download the repository

In Terminal, PowerShell, or your preferred shell, move to the folder where you want the project and run:

```sh
git clone https://github.com/ripscreates/framewise.git
cd framewise
```

The repository is public, so anyone can clone it with the commands above.

### 3. Install the saved dependencies

Run this from the `framewise` folder—the folder that contains `package.json` and `package-lock.json`:

```sh
npm ci
```

`npm ci` installs the versions saved in `package-lock.json`. If you see an error saying `package.json` cannot be found, check that the terminal is inside the `framewise` project folder before continuing.

### 4. Start the app

```sh
npm run dev
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

## Screenshots

From the project folder:

<p><img src="docs/assets/framewise-create.png" alt="Framewise starting screen of guided task setup." width="600" /></p>
<br><br>
<p><img src="docs/assets/framewise-selectfiles.png" alt="Framewise select file(s)..." width="600" /></p>
<br><br>
<p><img src="docs/assets/Framewise-trim.png" alt="Framewise trim file output by timecode." width="600" /></p>
<br><br>
<p><img src="docs/assets/Framewise-script.png" alt="Framewise shows what each section in command means." width="600" /></p>
<br><br>
<p><img src="docs/assets/Framewise-history.png" alt="Framewise history screen, to re-run or save script" width="600" /></p>
<br><br>


## Optional: build a production version

From the project folder:

```sh
npm run build
npm run preview
```

The build command prepares the app for hosting. The preview command serves that build on your computer so you can inspect it. The project does not currently include a configured public deployment.

## Set up with an AI coding agent

You can give an AI coding agent this repository URL and ask it to set up Framewise on your computer. This project does not need an AI API key.

> Set up Framewise from this repository for local use. Read README.md and PROJECT_STATUS.md first. Use Node.js 22.12.0 or newer with npm 10 or newer. Run npm ci, then npm run dev. Do not add or upload my media files. Tell me the local browser address when the app starts, and explain that the first conversion downloads the pinned FFmpeg WebAssembly engine from unpkg.

The agent should explain each step and leave your media files on your device. The first browser conversion still needs an internet connection to download the FFmpeg engine.

## Troubleshooting

| What you see | What to try |
| --- | --- |
| `package.json` not found | Change into the `framewise` folder, then run the command again. |
| `node` or `npm` is not recognized | Close and reopen the terminal after installing Node.js. If either command is still missing, check that the Node.js installation folder is on your PATH. |
| `npm ci` says the lockfile and package file disagree | Check that `package.json` and `package-lock.json` came from the same repository revision and run the command from the project folder. |
| npm reports `edgesOut` or `Cannot read properties of null` | Use `npm ci` from the project root with the matching `package-lock.json`. If it continues, include your Node.js and npm versions with the issue report. |
| FFmpeg engine fails to load | Check your internet connection and allow access to `unpkg.com`, then refresh and try again. |
| Browser cannot save directly to a folder | Use desktop Chrome or Edge, or choose the individual download option. |
| `ffmpeg` is not recognized in your terminal | This affects copied desktop commands only. Install desktop FFmpeg and ensure it is available on your PATH. On Windows, use Git Bash or WSL for the generated command syntax. |
| A large file stops or runs out of memory | Try a smaller file or run the copied command with desktop FFmpeg. |


## Technology and references

- App: React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, Radix UI, and Lucide icons
- Browser processing: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/)
- Desktop media toolkit: [FFmpeg documentation](https://ffmpeg.org/documentation.html), including [commands](https://ffmpeg.org/ffmpeg.html), [filters](https://ffmpeg.org/ffmpeg-filters.html), [codecs](https://ffmpeg.org/ffmpeg-codecs.html), and [formats](https://ffmpeg.org/ffmpeg-formats.html)
- Project tools: [Node.js](https://nodejs.org/en/download), [npm](https://docs.npmjs.com/), [Git](https://git-scm.com/doc), [React](https://react.dev/learn), [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview), and [Vite](https://vite.dev/guide/)
- [Framewise V1 retrospective PDF](public/v1-retrospective.pdf) — project timeline, interface captures, lessons, and references. The interactive retrospective page is also available at `/v1-retrospective` while the local app is running.

## Feedback and contributions

> **V1 note:** Framewise was originally built and first tested on an Apple M1 Mac. Automated clean-install and production-build checks pass on macOS, Linux, and Windows with Node.js 22.12.0 and 24.x. Browser-based conversion and folder-saving behavior still need hands-on checks across operating systems and browsers. Please include your operating system and browser with any issue report.

See [project status and remaining validation](PROJECT_STATUS.md) for current gaps and next steps.


Use [GitHub Issues](https://github.com/ripscreates/framewise/issues/new/choose) to report a problem or suggest an improvement. The issue forms ask for the details that help reproduce a problem, including operating system, browser, the steps you took, and whether you used browser conversion or a copied desktop command. Please do not attach private media files; remove personal file paths from screenshots or logs.

For a change you would like to make yourself, see [CONTRIBUTING.md](CONTRIBUTING.md). Existing issues are also a good place to check whether someone has reported the same problem.

## License and third-party software

The original Framewise source code and project documentation in this repository are offered under the [MIT License](LICENSE). You may use, modify, and redistribute those materials under its terms, including keeping the copyright and permission notice.

Third-party software and services keep their own licenses and terms. In particular, Framewise loads `@ffmpeg/core@0.12.10` from unpkg for browser conversions. The package metadata declares that core package as **GPL-2.0-or-later**. The `@ffmpeg/ffmpeg` JavaScript wrapper is MIT-licensed, while the ffmpeg.wasm project explains that its WebAssembly core follows the licenses of FFmpeg and the external libraries included in its build. See the [ffmpeg.wasm FAQ](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/faq.md), [core package metadata](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/core/package.json), and [FFmpeg's licensing guidance](https://ffmpeg.org/legal.html).

The Framewise MIT license does not relicense FFmpeg, the WebAssembly core, other dependencies, web fonts, or codecs. Before bundling or redistributing the media engine, check the exact core source, build configuration, and applicable third-party notices.

Support your FFmpeg devs https://www.ffmpeg.org/donations.html
