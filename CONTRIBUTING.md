# Contributing to Flash Speed

Thanks for helping make the web faster. You don't need to be a performance expert: if you've fixed a slow page, you know something Flash Speed should check.

## Ways to help

- **Add an audit rule.** The best first contribution. Each rule is one file. See [docs/writing-a-rule.md](docs/writing-a-rule.md).
- **Add an image CDN** URL builder to `imageCdns` in `src/images.ts` (Bunny, ImageKit, Sanity, Shopify…).
- **Add a host** output to `src/headers.ts` (Firebase, Caddy, IIS…).
- **Write a guide** in `docs/` for using Flash Speed with a framework you know.
- **Report a false positive.** If a rule flags something that is actually fine, open an issue with the HTML. These are bugs.

## Setup

You need Node.js 20 or later.

```bash
git clone https://github.com/<your-username>/flash-speed.git
cd flash-speed
npm install
npm test
```

`npm test` builds the TypeScript in `src/` to `dist/` and runs the tests in `test/`.

## Making a change

1. Fork the repo and create a branch: `git checkout -b rule/no-sync-xhr`.
2. Make your change, with a test. Every rule needs at least one HTML snippet it flags and one it doesn't.
3. Run `npm test`.
4. Open a pull request and fill in the template. Say which metric (LCP, CLS, INP, FCP, TTFB) the change helps and link a source (web.dev, MDN, Chrome docs or a measurement).

## Guidelines

- **No runtime dependencies.** Flash Speed runs in browsers and edge workers and must stay tiny. Dev dependencies are fine when they're worth it.
- **Every finding explains itself.** Messages say what's wrong and how to fix it, in plain English.
- **Avoid false positives.** A rule that's sometimes wrong should be `info`, not `error`. When unsure, skip.
- **Back claims with evidence.** Rules and presets should match current browser behaviour, with a link in the PR.
- **Keep lists alphabetical** (rules registry, docs tables) so merge conflicts stay small.

## Commit messages

Short and in the imperative: `Add no-sync-xhr rule`, `Fix srcset for URLs with a hash`. One topic per pull request.

## Releases

Maintainers publish to npm from GitHub Releases (see `.github/workflows/release.yml`). Version numbers follow [semver](https://semver.org): a new rule that defaults to `error` is a breaking change, because it can fail someone's CI.

## Code of conduct

Everyone taking part agrees to the [Code of Conduct](CODE_OF_CONDUCT.md).
