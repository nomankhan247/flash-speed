# Running Flash Speed in CI

Add this job to your project's `.github/workflows/` to check every pull request. Change `npm run build` and `dist` to your build command and output folder.

```yaml
name: Performance
on: [pull_request]

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Speed audit
        run: npx flash-speed audit dist
      - name: Performance budget
        run: npx flash-speed budget dist
```

Both commands exit with code 1 when something fails, which fails the job:

- `audit` fails on any `error` finding. Use `--fail-on warn` to be stricter, or set `audit.failOn` in `flash-speed.config.json`.
- `budget` fails when any limit in `budget` (or the defaults) is exceeded.

Use `--json` with either command to feed the results into another tool or a PR comment.
