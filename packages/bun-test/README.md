# @effect/bun-test

A set of helpers for testing [Effect](https://effect.website) programs with
Bun's native [`bun:test`](https://bun.sh/docs/cli/test) runner.

The API mirrors [`@effect/vitest`](https://www.npmjs.com/package/@effect/vitest)
(`it.effect`, `it.live`, `layer`, `it.prop`, `flakyTest`, …) so Effect test
suites move between the two runners without rewrites.

## Installation

```sh
bun add -d @effect/bun-test
```

## Usage

```ts
import { assert, describe, expect, it, layer } from "@effect/bun-test"
import { Context, Effect, Layer } from "effect"

class Foo extends Context.Service<Foo, "foo">()("Foo") {
  static layer = Layer.succeed(Foo)("foo")
}

it.effect("plain effect test", () => Effect.sync(() => expect(1).toEqual(1)))

layer(Foo.layer)("with a shared layer", (it) => {
  it.effect("has Foo in context", () =>
    Effect.gen(function*() {
      const foo = yield* Foo
      assert.strictEqual(foo, "foo")
    }))
})
```

Run with:

```sh
bun test
```

## Timeouts interrupt fibers

Bun's own test timeout fails the test but cannot stop the Effect running
behind it, so finalizers would never run. The wrapper owns the timeout
instead: when it fires, the test context's `AbortSignal` aborts, the Effect
fiber is interrupted, and its finalizers run — Bun keeps a slightly larger
timeout as a backstop.

## Differences from `@effect/vitest`

- **`addEqualityTesters`** is a no-op — `bun:test`'s `expect` does not expose
  `addEqualityTesters`. Compare `Equal` values with `Equal.equals` or the
  helpers in `@effect/bun-test/utils`.
- **`TestContext`** — Bun doesn't pass a context object to test functions, so
  the wrapper synthesises one (`signal`, `onTestFinished`, `onTestFailed`).
- **`assert`** — Vitest re-exports chai's `assert`; this package ships a small
  compatible subset built on `node:assert`.
