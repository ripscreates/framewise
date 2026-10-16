# Framewise project status

**Updated:** October 15, 2026

## Current snapshot

- The Framewise app source is in the private `ripscreates/framewise` repository. Pull request [#1](https://github.com/ripscreates/framewise/pull/1) was merged into `main` on October 13, 2026 (merge commit `9a6366fd173730e0ae69a103d1ce9911c12a8501`).
- The Lovable project remains available at [Framewise Media Studio](https://lovable.dev/projects/9b4e4803-c642-4d6e-90f5-fb1a948e946a), with a [preview](https://id-preview--9b4e4803-c642-4d6e-90f5-fb1a948e946a.lovable.app/). On October 13, its status reported ready, no project error, and unpublished. Its latest recorded source commit is `a7324bf73aba250fb1c04935756dd9f560bfebc1` from October 12.
- A sync relationship between the Lovable project and this GitHub repository was not confirmed. Treat them as separate copies until that is verified.
- The app provides guided workflows for compressing, converting, trimming, extracting audio, resizing, adding subtitles, and making GIFs. It supports multi-file/folder selection, command review, browser-based FFmpeg processing, local run history, and repeat.
- The natural-language guide uses local keyword matching, as agreed for the first version. It does not need an OpenAI key or Dyad credits; the Help page points to official FFmpeg references for tasks outside the guided workflows.
- Merged PR [#3](https://github.com/ripscreates/framewise/pull/3) makes folder-relative input paths visible in desktop commands, keeps browser output names compatible with folder saves, and improves unknown-request guidance and Help content.
- The production build completed on October 14 using the dependencies installed from the repository manifest. This confirms the app compiles; it does not confirm a real media conversion.
- The user confirmed the app runs locally on October 15. A local History capture records one successful GIF run; batch conversion, other formats, and save destinations still need a broader check.

## Gaps and blockers

1. **Media processing needs broader validation.** One GIF run is recorded in a local History capture. A representative non-GIF conversion, batch conversion, output-save/download behavior, and folder-selected desktop commands still need to be checked in a supported browser.
2. **Dependency install policy is not fully settled.** The repository contains a Bun lockfile and documents npm as an alternative, but no npm lockfile is present. The source `bunfig.toml` was not copied because automatic review rejected its exemptions from Bun’s 24-hour dependency-age guard.
3. **Automated test suite is absent from this repository copy.** The Lovable import's test files and runner configuration were not transferred. No tests were run during this follow-up.
4. **Hosting and release remain open.** The app has not been deployed from the master repository. Confirm hosting requirements for the browser FFmpeg engine before choosing a release target.

The prior handoff reported that a Lovable edit was blocked by a workspace credit limit on October 12. Current credit availability was not exposed by the project-status check.

## Recommended next steps

1. Validate one known-good conversion, one batch, and folder-save/download behavior in a supported browser.
2. Choose and document one reproducible install path and lockfile.
3. Review the Lovable-provided TanStack/Vite configuration if this repository will be maintained independently of Lovable.
4. Decide on hosting and publication after validation.
