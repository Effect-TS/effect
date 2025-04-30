import { describe, expect, it } from "@effect/vitest"
import { assertFalse, assertInclude, assertInstanceOf, assertTrue, strictEqual } from "@effect/vitest/utils"
import { Cause, Effect, Option, pipe } from "effect"

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
      assertInclude(rendered, "spanA")
      assertInclude(rendered, "cause-rendering.test.ts:10:18")
      assertInclude(rendered, "spanB")
      assertInclude(rendered, "cause-rendering.test.ts:9:16")
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
      assertInclude(rendered, "spanA")
      assertInclude(rendered, "spanB")
      const obj = Option.getOrThrow(Cause.failureOption(cause))
      assertInstanceOf(obj, E1)
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
      assertInclude(rendered, "spanA")
      assertInclude(rendered, "spanB")
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
      assertInclude(rendered, "spanA")
      assertInclude(rendered, "spanB")
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
      assertInclude(pretty, "cause-rendering.test.ts")
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
      assertInclude(error.stack, "cause-rendering.test.ts:105")
      assertInclude(error.stack, "span-123")
      assertInclude(error.stack, "cause-rendering.test.ts:108")
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
      assertInclude(prettyErrors[0].stack, "at fn-0 ")
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
      assertInclude(pretty, "[cause]: Error: child")
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
      assertInclude(pretty, "[cause]: Error: child")
      assertInclude(pretty, "[cause]: Error: child2")
    }))
})
