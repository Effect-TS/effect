import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
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
      assert.include(rendered, "spanB")
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
            onTrue: Effect.fail(new E2()),
            onFalse: Effect.fail(err)
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
            onTrue: Effect.fail(new E2()),
            onFalse: Effect.fail(new E1())
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
            onTrue: Effect.fail(new E2()),
            onFalse: Effect.fail(new E1())
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
})
