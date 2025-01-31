import { describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Option, pipe } from "effect"
import { assertFalse, assertIncludes, assertTrue, strictEqual } from "effect/test/util"

describe("Effect", () => {
  it.effect("Cause should include span data", () =>
    Effect.gen(function*() {
      const cause = yield* (Effect.flip(Effect.sandbox(
        Effect.withSpan("spanB")(
          Effect.withSpan("spanA")(
            Effect.fail(new Error("ok"))
          )
        )
      )))
      const rendered = Cause.pretty(cause)
      assertIncludes(rendered, "spanA")
      assertIncludes(rendered, "cause-rendering.test.ts:10:18")
      assertIncludes(rendered, "spanB")
      assertIncludes(rendered, "cause-rendering.test.ts:9:16")
    }))
  it.effect("catchTag should not invalidate traces", () =>
    Effect.gen(function*() {
      class E1 {
        readonly _tag = "E1"
      }
      class E2 {
        readonly _tag = "E2"
      }
      const err = new E1()
      const effect = Effect.withSpan("spanB")(
        Effect.withSpan("spanA")(
          Effect.if(Effect.sync(() => Math.random() > 1), {
            onTrue: () => Effect.fail(new E2()),
            onFalse: () => Effect.fail(err)
          })
        )
      ).pipe(Effect.catchTag("E2", (e) => Effect.die(e)))
      const cause = yield* (Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assertIncludes(rendered, "spanA")
      assertIncludes(rendered, "spanB")
      const obj = Option.getOrThrow(Cause.failureOption(cause))
      assertTrue(obj instanceof E1)
      assertFalse(err === obj)
      assertTrue(err === Cause.originalError(obj))
    }))
  it.effect("refail should not invalidate traces", () =>
    Effect.gen(function*() {
      class E1 {
        readonly _tag = "E1"
      }
      class E2 {
        readonly _tag = "E2"
      }
      const effect = Effect.withSpan("spanB")(
        Effect.withSpan("spanA")(
          Effect.if(Effect.sync(() => Math.random() > 1), {
            onTrue: () => Effect.fail(new E2()),
            onFalse: () => Effect.fail(new E1())
          })
        )
      ).pipe(Effect.catchAll((e) => Effect.fail(e)))
      const cause = yield* (Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assertIncludes(rendered, "spanA")
      assertIncludes(rendered, "spanB")
    }))
  it.effect("catchTags should not invalidate traces", () =>
    Effect.gen(function*() {
      class E1 {
        readonly _tag = "E1"
      }
      class E2 {
        readonly _tag = "E2"
      }
      const effect = Effect.withSpan("spanB")(
        Effect.withSpan("spanA")(
          Effect.if(Effect.sync(() => Math.random() > 1), {
            onTrue: () => Effect.fail(new E2()),
            onFalse: () => Effect.fail(new E1())
          })
        )
      ).pipe(Effect.catchTags({ E2: (e) => Effect.die(e) }))
      const cause = yield* (Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assertIncludes(rendered, "spanA")
      assertIncludes(rendered, "spanB")
    }))
  it.effect("shows line where error was created", () =>
    Effect.gen(function*() {
      const cause = yield* pipe(
        Effect.sync(() => {
          throw new Error("ok")
        }),
        Effect.sandbox,
        Effect.flip
      )
      const pretty = Cause.pretty(cause)
      assertIncludes(pretty, "cause-rendering.test.ts")
    }))

  it.effect("functionWithSpan PrettyError stack", () =>
    Effect.gen(function*() {
      const fail = Effect.functionWithSpan({
        body: (_id: number) => Effect.fail(new Error("boom")),
        options: (id) => ({ name: `span-${id}` })
      })
      const cause = yield* fail(123).pipe(Effect.sandbox, Effect.flip)
      const prettyErrors = Cause.prettyErrors(cause)
      strictEqual(prettyErrors.length, 1)
      const error = prettyErrors[0]
      strictEqual(error.name, "Error")
      assertIncludes(error.stack, "cause-rendering.test.ts:105")
      assertIncludes(error.stack, "span-123")
      assertIncludes(error.stack, "cause-rendering.test.ts:108")
    }))

  it.effect("includes span name in stack", () =>
    Effect.gen(function*() {
      const fn = Effect.functionWithSpan({
        options: (n) => ({ name: `fn-${n}` }),
        body: (a: number) =>
          Effect.sync(() => {
            strictEqual(a, 2)
          })
      })
      const cause = yield* fn(0).pipe(
        Effect.sandbox,
        Effect.flip
      )
      const prettyErrors = Cause.prettyErrors(cause)
      assertIncludes(prettyErrors[0].stack, "at fn-0 ")
    }))

  // ENABLE TO TEST EXPECT OUTPUT
  it.effect.skip("shows assertion message", () =>
    Effect.gen(function*() {
      yield* Effect.void
      expect({ foo: "ok" }).toStrictEqual({ foo: "bar" })
    }))

  it.effect("multiline message", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.fail(new Error("Multi-line\nerror\nmessage")).pipe(
        Effect.sandbox,
        Effect.flip
      )
      const pretty = Cause.pretty(cause)
      assertTrue(pretty.startsWith(`Error: Multi-line
error
message
    at`))
    }))

  it.effect("pretty includes error.cause with renderErrorCause: true", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.fail(new Error("parent", { cause: new Error("child") })).pipe(
        Effect.sandbox,
        Effect.flip
      )
      const pretty = Cause.pretty(cause, { renderErrorCause: true })
      assertIncludes(pretty, "[cause]: Error: child")
    }))

  it.effect("pretty nested cause", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.fail(
        new Error("parent", { cause: new Error("child", { cause: new Error("child2") }) })
      ).pipe(
        Effect.sandbox,
        Effect.flip
      )
      const pretty = Cause.pretty(cause, { renderErrorCause: true })
      assertIncludes(pretty, "[cause]: Error: child")
      assertIncludes(pretty, "[cause]: Error: child2")
    }))
})
