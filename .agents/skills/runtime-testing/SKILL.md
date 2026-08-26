---
name: runtime-testing
description: Runtime testing. Use for Vitest tests under packages/*/test, including Effect-returning, scoped, live, synchronous, or time-dependent cases.
---

Use `it.effect` for tests that return Effects. `it.effect` and `it.live` provide
and close a `Scope` for every test, so return scoped effects directly rather
than wrapping the test body in `Effect.scoped`.

```ts
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"

it.effect("works with Effects", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    assert.strictEqual(result, expectedValue)
  }))
```

Use regular `it` for pure synchronous functions:

```ts
import { assert, it } from "@effect/vitest"

it("works with pure functions", () => {
  const result = pureFunction(input)
  assert.strictEqual(result, expectedValue)
})
```

Apply these rules:

- Use `assert` from `@effect/vitest`, not Vitest's `expect`.
- Use `TestClock` for time-dependent operations.
- Group related tests with `describe`.
- Keep `Effect.runSync` out of unit tests. The `jsdocs` skill documents the
  limited cases where runnable documentation may use it.

## Validation

Run only tests covering the changed files. Prefer one repository-relative test
path and narrow by test name when useful:

```sh
pnpm test --run packages/effect/test/Option.test.ts
pnpm test --run packages/effect/test/Option.test.ts -t "test name"
```

Run a package-wide project only when narrower coverage is insufficient. The
task is complete when the targeted test passes and every applicable check in
the root `AGENTS.md` validation matrix passes.
