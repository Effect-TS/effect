---
"effect": patch
---

Add `Arbitrary.configureGlobal` to set default options for property checking and sampling, including the run count used by `@effect/vitest`. Explicit per-call options take precedence; passing an empty object restores the built-in defaults.
