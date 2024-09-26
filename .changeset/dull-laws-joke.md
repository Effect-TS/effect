---
"@effect/vitest": patch
---

add layer api to `@effect/vitest`

This allows you to share a `Layer` between multiple tests, optionally wrapping
the tests in a `describe` block.

```ts
import { expect, layer } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"

class Foo extends Context.Tag("Foo")<Foo, "foo">() {
  static Live = Layer.succeed(Foo, "foo")
}

class Bar extends Context.Tag("Bar")<Bar, "bar">() {
  static Live = Layer.effect(
    Bar,
    Effect.map(Foo, () => "bar" as const)
  )
}

layer(Foo.Live)("layer", (it) => {
  it.effect("adds context", () =>
    Effect.gen(function* () {
      const foo = yield* Foo
      expect(foo).toEqual("foo")
    })
  )

  it.layer(Bar.Live)("nested", (it) => {
    it.effect("adds context", () =>
      Effect.gen(function* () {
        const foo = yield* Foo
        const bar = yield* Bar
        expect(foo).toEqual("foo")
        expect(bar).toEqual("bar")
      })
    )
  })
})
```
