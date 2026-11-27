Helpers for hill-climbing `pnpm hostperf`. They are not part of the library.

- `run-case.ts`: runs one hostperf case for a fixed time and prints ns/op, under Node or Bun. Add `--cpu-prof --cpu-prof-dir=<dir>` under Node to profile it.
- `cpu-functions.mjs` / `cpu-lines.mjs`: rank self time by function or by source line in a `.cpuprofile`.
- `bundle-quick.sh`: rebuilds only `packages/effect` and compares all fixtures against an existing `tmp/bundle-base` worktree, about 15s instead of a full `pnpm bundle-compare main`. Prints a few core fixtures and the summed difference.

Example:

```sh
node --cpu-prof --cpu-prof-dir=tmp/prof hill-climb-tools/run-case.ts app-untraced 2000
node hill-climb-tools/cpu-lines.mjs tmp/prof/*.cpuprofile 30
```
