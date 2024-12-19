import { afterAll, describe, expect, it, layer } from "@effect/vitest"
import { Context, Effect, FastCheck, Layer, Schema } from "effect"

it.live(
  "live %s",
  () => Effect.sync(() => expect(1).toEqual(1))
)
it.effect(
  "effect",
  () => Effect.sync(() => expect(1).toEqual(1))
)
it.scoped(
  "scoped",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)
it.scopedLive(
  "scopedLive",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)

// each

it.live.each([1, 2, 3])(
  "live each %s",
  (n) => Effect.sync(() => expect(n).toEqual(n))
)
it.effect.each([1, 2, 3])(
  "effect each %s",
  (n) => Effect.sync(() => expect(n).toEqual(n))
)
it.scoped.each([1, 2, 3])(
  "scoped each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)
it.scopedLive.each([1, 2, 3])(
  "scopedLive each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)

// skip

it.live.skip(
  "live skipped",
  () => Effect.die("skipped anyway")
)
it.effect.skip(
  "effect skipped",
  () => Effect.die("skipped anyway")
)
it.scoped.skip(
  "scoped skipped",
  () => Effect.acquireRelease(Effect.die("skipped anyway"), () => Effect.void)
)
it.scopedLive.skip(
  "scopedLive skipped",
  () => Effect.acquireRelease(Effect.die("skipped anyway"), () => Effect.void)
)

// skipIf

it.effect.skipIf(true)("effect skipIf (true)", () => Effect.die("skipped anyway"))
it.effect.skipIf(false)("effect skipIf (false)", () => Effect.sync(() => expect(1).toEqual(1)))

// runIf

it.effect.runIf(true)("effect runIf (true)", () => Effect.sync(() => expect(1).toEqual(1)))
it.effect.runIf(false)("effect runIf (false)", () => Effect.die("not run anyway"))

// The following test is expected to fail because it simulates a test timeout.
// Be aware that eventual "failure" of the test is only logged out.
it.scopedLive("interrupts on timeout", (ctx) =>
  Effect.gen(function*() {
    let acquired = false

    ctx.onTestFailed(() => {
      if (acquired) {
        // eslint-disable-next-line no-console
        console.error("'effect is interrupted on timeout' @effect/vitest test failed")
      }
    })

    yield* Effect.acquireRelease(
      Effect.sync(() => acquired = true),
      () => Effect.sync(() => acquired = false)
    )
    yield* Effect.sleep(1000)
  }), { timeout: 100, fails: true })

class Foo extends Context.Tag("Foo")<Foo, "foo">() {
  static Live = Layer.succeed(Foo, "foo")
}

class Bar extends Context.Tag("Bar")<Bar, "bar">() {
  static Live = Layer.effect(Bar, Effect.map(Foo, () => "bar" as const))
}

layer(Foo.Live)("layer", (it) => {
  it.effect("adds context", () =>
    Effect.gen(function*() {
      const foo = yield* Foo
      expect(foo).toEqual("foo")
    }))

  it.layer(Bar.Live)("nested", (it) => {
    it.effect("adds context", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        const bar = yield* Bar
        expect(foo).toEqual("foo")
        expect(bar).toEqual("bar")
      }))
  })

  it.layer(Bar.Live)((it) => {
    it.effect("without name", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        const bar = yield* Bar
        expect(foo).toEqual("foo")
        expect(bar).toEqual("bar")
      }))
  })

  describe("release", () => {
    let released = false
    afterAll(() => {
      expect(released).toEqual(true)
    })

    class Scoped extends Context.Tag("Scoped")<Scoped, "scoped">() {
      static Live = Layer.scoped(
        Scoped,
        Effect.acquireRelease(
          Effect.succeed("scoped" as const),
          () => Effect.sync(() => released = true)
        )
      )
    }

    it.layer(Scoped.Live)((it) => {
      it.effect("adds context", () =>
        Effect.gen(function*() {
          const foo = yield* Foo
          const scoped = yield* Scoped
          expect(foo).toEqual("foo")
          expect(scoped).toEqual("scoped")
        }))
    })

    it.effect.prop("adds context", [realNumber], ([num]) =>
      Effect.gen(function*() {
        const foo = yield* Foo
        expect(foo).toEqual("foo")
        return num === num
      }))
  })
})

// property testing

const realNumber = Schema.Finite.pipe(Schema.nonNaN())

it.prop("symmetry", [realNumber, FastCheck.integer()], ([a, b]) => a + b === b + a)

it.prop(
  "symmetry with object",
  { a: realNumber, b: FastCheck.integer() },
  ({ a, b }) => a + b === b + a
)

it.effect.prop("symmetry", [realNumber, FastCheck.integer()], ([a, b]) =>
  Effect.gen(function*() {
    yield* Effect.void

    return a + b === b + a
  }))

it.effect.prop("symmetry with object", { a: realNumber, b: FastCheck.integer() }, ({ a, b }) =>
  Effect.gen(function*() {
    yield* Effect.void

    return a + b === b + a
  }))

it.scoped.prop(
  "should detect the substring",
  { a: Schema.String, b: Schema.String, c: FastCheck.string() },
  ({ a, b, c }) =>
    Effect.gen(function*() {
      yield* Effect.scope
      return (a + b + c).includes(b)
    })
)
