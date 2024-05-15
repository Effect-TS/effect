import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("Cause should include span data", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(
        Effect.withSpan("spanB")(
          Effect.withSpan("spanA")(
            Effect.fail(new Error("ok"))
          )
        )
      )))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "cause-rendering.test.ts:12")
      assert.include(rendered, "spanB")
      assert.include(rendered, "cause-rendering.test.ts:11")
    }))
  it.effect("catchTag should not invalidate traces", () =>
    Effect.gen(function*($) {
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
      const cause = yield* $(Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
      const obj = Option.getOrThrow(Cause.failureOption(cause))
      assert.isTrue(obj instanceof E1)
      assert.isFalse(err === obj)
      assert.isTrue(err === Cause.originalError(obj))
    }))
  it.effect("refail should not invalidate traces", () =>
    Effect.gen(function*($) {
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
      const cause = yield* $(Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
    }))
  it.effect("catchTags should not invalidate traces", () =>
    Effect.gen(function*($) {
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
      const cause = yield* $(Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
    }))
  it.effect("shows line where error was created", () =>
    Effect.gen(function*($) {
      const cause = yield* $(
        Effect.sync(() => {
          throw new Error("ok")
        }),
        Effect.sandbox,
        Effect.flip
      )
      const pretty = Cause.pretty(cause)
      assert.include(pretty, "cause-rendering.test.ts")
    }))

  it.effect("functionWithSpan PrettyError stack", () =>
    Effect.gen(function*() {
      const fail = Effect.functionWithSpan({
        body: (_id: number) => Effect.fail(new Error("boom")),
        options: (id) => ({ name: `span-${id}` })
      })
      const cause = yield* fail(123).pipe(Effect.sandbox, Effect.flip)
      const prettyErrors = Cause.prettyErrors(cause)
      assert.strictEqual(prettyErrors.length, 1)
      const error = prettyErrors[0]
      assert.strictEqual(error.name, "Error")
      assert.notInclude(error.stack, "/internal/")
      assert.include(error.stack, "cause-rendering.test.ts:107")
      assert.include(error.stack, "span-123")
      assert.include(error.stack, "cause-rendering.test.ts:110")
    }))

  it.effect("includes span name in stack", () =>
    Effect.gen(function*() {
      const fn = Effect.functionWithSpan({
        options: (n) => ({ name: `fn-${n}` }),
        body: (a: number) =>
          Effect.sync(() => {
            assert.strictEqual(a, 2)
          })
      })
      const cause = yield* fn(0).pipe(
        Effect.sandbox,
        Effect.flip
      )
      const prettyErrors = Cause.prettyErrors(cause)
      assert.include(prettyErrors[0].stack ?? "", "at fn-0 ")
    }))
})
