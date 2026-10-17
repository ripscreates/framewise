# Contributing to Framewise

Thanks for helping make FFmpeg workflows easier to understand.

## Share feedback

Use the GitHub issue forms to report a problem or suggest an improvement. Before opening a new issue, check whether a similar one already exists. Do not attach private media files, and remove personal file paths from screenshots or logs.

## Propose a change

For a small fix, open a pull request with a focused description and explain how you checked it. For a larger feature, open an issue first so the scope and user need are clear.

From the repository root, install the saved dependencies and run the app:

```sh
npm ci
npm run dev
```

Before submitting a code change, run the project checks that are relevant to it:

```sh
npm run lint
npm run build
```

The current `npm run lint` check reports existing Prettier formatting violations across the source tree. Cross-platform CI currently checks dependency installation and the production build; lint is not a passing release gate yet.

The current project does not have broad automated tests for media conversion. Include manual steps and the operating system/browser you used when behavior depends on them. Never commit API keys, private media, generated conversion output, or personal file paths.

## License

The original Framewise source and documentation are offered under the MIT License in [LICENSE](LICENSE). Third-party software, fonts, codecs, and other assets keep their upstream licenses. See the README for the current FFmpeg WebAssembly notices.
