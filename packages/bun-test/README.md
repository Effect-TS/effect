# @effect/bun-test

A set of helpers for testing [Effect](https://effect.website) programs with
Bun's native [`bun:test`](https://bun.sh/docs/cli/test) runner.

The API mirrors [`@effect/vitest`](https://www.npmjs.com/package/@effect/vitest)
(`it.effect`, `it.scoped`, `it.live`, `it.scopedLive`, `it.layer`, `it.prop`,
`flakyTest`, …) but runs under Bun's built-in test runner — useful when you
already use Bun as your runtime and want to avoid pulling in Vitest.

## Installation

```sh
bun add -d @effect/bun-test
```

## Usage

```ts
import { describe, expect, it, layer } from "@effect/bun-test"
import { Context, Effect, Layer } from "effect"

class Foo extends Context.Tag("Foo")<Foo, "foo">() {
  static Live = Layer.succeed(Foo, "foo")
}

it.effect("plain effect test", () =>
  Effect.sync(() => expect(1).toEqual(1))
)

describe("with a shared layer", () => {
  layer(Foo.Live)((it) => {
    it.effect("has Foo in context", () =>
      Effect.gen(function* () {
        const foo = yield* Foo
        expect(foo).toEqual("foo")
      })
    )
  })
})
```

Run with:

```sh
bun test
```

## What's supported

| Helper | Status |
| --- | --- |
| `it.effect` / `it.scoped` / `it.live` / `it.scopedLive` | ✅ |
| `.skip`, `.skipIf`, `.runIf`, `.only`, `.each`, `.fails` | ✅ |
| `.prop` (fast-check integration) | ✅ |
| `layer(...)` / nested `it.layer(...)` | ✅ |
| `flakyTest` | ✅ |
| `addEqualityTesters` (Effect `Equal.equals` integration) | ⚠️ no-op — see below |

### Differences from `@effect/vitest`

Bun's test runner does not expose all of Vitest's APIs. The notable gaps:

- **`addEqualityTesters`** is a no-op — `bun:test`'s `expect` does not yet
  expose `addEqualityTesters`. Use Effect's `Equal.equals` directly (or the
  helpers in `@effect/bun-test/utils`) when comparing values that implement the
  `Equal` trait.
- **`TestContext`** — Vitest passes a `TestContext` to each test fn (with
  `signal`, `onTestFailed`, `onTestFinished`, etc.). `bun:test` doesn't, so the
  context passed to your Effect tests is a minimal stub. `signal` is a fresh
  `AbortController().signal`; `onTestFailed` / `onTestFinished` register
  best-effort callbacks invoked after the Effect completes.
- **`scopedFixtures`** (Vitest's `it.scoped(fixtures)`) is not provided — Bun
  has no fixture system.

## License

MIT
