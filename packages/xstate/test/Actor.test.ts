import { Schema } from "@effect/schema"
import { fromEffect, fromEffectSchema } from "@effect/xstate/Actor"
import { Cause, Effect } from "effect"
import { assert, describe, test } from "vitest"
import { createActor } from "xstate"

const delayedActor = fromEffect(() => Effect.succeed(123).pipe(Effect.delay(10)))
const failActor = fromEffect(() => Effect.fail("error" as const))

class Multiply extends Schema.TaggedRequest<Multiply>()("Multiply", Schema.never, Schema.number, {
  number: Schema.number
}) {}

const multiplyActor = fromEffectSchema(Multiply, ({
  input
}) => Effect.succeed(input.number * 2))

describe("Actor", () => {
  test("delayed", () =>
    Effect.gen(function*(_) {
      const actor = createActor(yield* _(delayedActor)).start()
      assert.strictEqual(actor.getSnapshot().status, "active")
      assert.isDefined(actor.getSnapshot()._fiber)
      yield* _(Effect.sleep(10))
      assert.strictEqual(actor.getSnapshot().status, "done")
      assert.strictEqual(actor.getSnapshot().output, 123)
    }).pipe(Effect.runPromise))

  test("failure", () =>
    Effect.gen(function*(_) {
      const actor = createActor(yield* _(failActor))
      actor.subscribe({ error(_err) {} })
      actor.start()
      assert.strictEqual(actor.getSnapshot().status, "error")
      assert.strictEqual(actor.getSnapshot().output, undefined)
      assert.deepStrictEqual(actor.getSnapshot().error, Cause.fail("error"))
    }).pipe(Effect.runPromise))

  test("schema", () =>
    Effect.gen(function*(_) {
      const actor = createActor(yield* _(multiplyActor), { input: new Multiply({ number: 2 }) })
      actor.start()
      assert.strictEqual(actor.getSnapshot().status, "done")
      assert.strictEqual(actor.getSnapshot().output, 4)
      assert.deepStrictEqual(actor.getPersistedSnapshot(), {
        status: "done",
        output: 4,
        error: undefined,
        input: { _tag: "Multiply", number: 2 }
      } as any)
    }).pipe(Effect.runPromise))
})
