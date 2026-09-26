---
"effect": patch
"@effect/vitest": patch
---

Move unstable modules from `effect/unstable/*` to `effect/*` and remove the old export paths. Drop the `unstable` segment from imports. These APIs remain `@stability unstable`.

Move `Arbitrary` to the top level and update `@effect/vitest` to use the new entrypoint. Replace imports from `effect/arbitrary` or `effect/arbitrary/Arbitrary` with `import { Arbitrary } from "effect"` or `import * as Arbitrary from "effect/Arbitrary"`.
