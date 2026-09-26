---
"@effect/vitest": patch
---

Support Vitest fixtures in Effect tests created with `makeMethods(test.extend(...))`. `it.effect.each` now passes the test context as its second argument. Build `makeMethods` from `test` or `test.extend(...)`, not a suite-bound test from a `describe` callback: named `it.layer` tests can otherwise land outside their named suite, skipping its hooks and concurrency setting.
