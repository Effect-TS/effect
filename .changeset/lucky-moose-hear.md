---
"@effect/vitest": minor
---

Refactor `@effect/vitest` package.

- Clear separation of the public API and internals.
- Fix type of `scoped`, `live`, `scopedLive` and `effect` objects. Make sure `skip` and `only` are available.
- Add `each` method to `scoped`, `live`, `scopedLive` and `effect` objects.

Example usage

```ts
import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.scoped.skip(
  "test skipped",
  () =>
    Effect.acquireRelease(
      Effect.die("skipped anyway"),
      () => Effect.void
    )
)

it.effect.each([1, 2, 3])(
  "effect each %s",
  (n) => Effect.sync(() => expect(n).toEqual(n))
)
```
