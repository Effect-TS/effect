---
"@effect/cli": patch
---

cli: multiSelect supports per-choice default selection via `selected: true`; single select honors one default

- Add `selected?: boolean` to `Prompt.SelectChoice`
- Seed initial selection in `Prompt.multiSelect` from choices marked `selected: true`
- Allow `Prompt.select` to honor a single `selected: true` choice and throw an error if multiple defaults are provided
- Add tests covering both behaviors

