import { Schema } from "@effect/schema"
import { Actor } from "@effect/xstate"
import { Cause, Chunk, Effect, Stream } from "effect"
import { assert, describe, test } from "vitest"
import { createActor } from "xstate"

const delayedActor = Actor.fromEffect(() => Effect.succeed(123).pipe(Effect.delay(10)))
const failActor = Actor.fromEffect(() => Effect.fail("error" as const))
const streamActor = Actor.fromStream(() => Stream.make(1, 2, 3, 4, 5))

class Multiply extends Schema.TaggedRequest<Multiply>()("Multiply", Schema.never, Schema.number, {
  number: Schema.number
}) {}

const multiplyActor = Actor.fromEffectSchema(Multiply, (_ref, input) => Effect.succeed(input.number * 2))

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

  test("run", () =>
    Effect.gen(function*(_) {
      const actor = yield* _(Actor.run(delayedActor))
      const chunk = yield* _(Stream.runCollect(actor.stream))
      const arr = Chunk.toReadonlyArray(chunk)
      assert.strictEqual(arr.length, 2)
      assert.strictEqual(arr[0].status, "active")
      assert.strictEqual(arr[1].status, "done")
      assert.strictEqual(arr[1].output, 123)
    }).pipe(Effect.scoped, Effect.runPromise))

  test("runEffect", () =>
    Effect.gen(function*(_) {
      const result = yield* _(Actor.runEffect(delayedActor))
      assert.strictEqual(result, 123)
    }).pipe(Effect.runPromise))

  test("runEffect/fail", () =>
    Effect.gen(function*(_) {
      const result = yield* _(Actor.runEffect(failActor), Effect.flip)
      assert.strictEqual(result, "error")
    }).pipe(Effect.runPromise))

  test("runStreamContext", () =>
    Effect.gen(function*(_) {
      const result = yield* _(
        Actor.runStreamContext(streamActor),
        Stream.runCollect
      )
      assert.deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2, 3, 4, 5])
    }).pipe(Effect.runPromise))
})
