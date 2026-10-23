---
"@effect/vitest": patch
---

Add a `buildPerTest` option to `layer` and `it.layer` that builds the layer once per test, so selected services are recreated for each test while services from enclosing blocks stay shared.
