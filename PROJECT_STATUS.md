# Framewise project status

**Updated:** October 13, 2026

## Current snapshot

- The Framewise app source is in the private `ripscreates/framewise` repository. Pull request [#1](https://github.com/ripscreates/framewise/pull/1) was merged into `main` on October 13, 2026 (merge commit `9a6366fd173730e0ae69a103d1ce9911c12a8501`).
- The Lovable project remains available at [Framewise Media Studio](https://lovable.dev/projects/9b4e4803-c642-4d6e-90f5-fb1a948e946a), with a [preview](https://id-preview--9b4e4803-c642-4d6e-90f5-fb1a948e946a.lovable.app/). On October 13, its status reported ready, no project error, and unpublished. Its latest recorded source commit is `a7324bf73aba250fb1c04935756dd9f560bfebc1` from October 12.
- A sync relationship between the Lovable project and this GitHub repository was not confirmed. Treat them as separate copies until that is verified.
- The app provides guided workflows for compressing, converting, trimming, extracting audio, resizing, adding subtitles, and making GIFs. It supports multi-file/folder selection, command review, browser-based FFmpeg processing, local run history, and repeat.

## Gaps and blockers

1. **No live AI integration.** The natural-language helper uses local keyword matching in `src/lib/intent.ts`; it does not call an AI model. If model-powered support is required, choose the provider and secure server-side integration, and decide what user prompts may be sent.
2. **Conversion and build are unverified.** No build or real media conversion was run during the initial copy. A representative single-file conversion, batch run, and output-save check remain to be done.
3. **Dependency-age policy needs a decision.** The source `bunfig.toml` was not copied because automatic review rejected its exemptions from Bun’s 24-hour dependency-age guard. The Bun lockfile is present. The README describes npm as an alternative; choose and document the approved install path before relying on a reproducible setup.
4. **Test files/config are absent.** The source test files and Vitest configuration were not copied because adding tests was outside the request for that transfer. No tests were run.
5. **Not published.** The Lovable project still reports unpublished. No deployment or public release has been performed.

The prior handoff reported that a Lovable edit was blocked by a workspace credit limit on October 12. Current credit availability was not exposed by the project-status check.

## Recommended next steps

1. Decide whether local keyword suggestions are acceptable for the first release or whether Framewise needs a real AI model.
2. Confirm the install policy and whether the GitHub and Lovable copies should sync.
3. Run the production build and validate one known-good conversion, one batch, and folder-save/download behavior.
4. Add or restore an automated test suite if desired, then run it.
5. Decide on hosting and publication after validation.
