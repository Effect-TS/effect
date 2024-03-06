import { Schema } from "@effect/schema"
import { Machine } from "@effect/xstate"
import { Cause, Context, Effect, Layer, Stream } from "effect"
import { assert, describe, test } from "vitest"

class Increment extends Schema.TaggedRequest<Increment>()("Increment", Schema.never, Schema.number, {}) {}
class Decrement extends Schema.TaggedRequest<Decrement>()("Decrement", Schema.never, Schema.number, {}) {}
class IncrementBy extends Schema.TaggedRequest<IncrementBy>()("IncrementBy", Schema.never, Schema.number, {
  number: Schema.number
}) {}
class Multiply extends Schema.TaggedRequest<Multiply>()("Multiply", Schema.never, Schema.number, {}) {}

class FailBackground extends Schema.TaggedRequest<FailBackground>()("FailBackground", Schema.never, Schema.void, {}) {}

const counter = Machine.make<number>()(
  (_: number, previous) => Effect.succeed([previous ?? _, Context.empty()])
).pipe(
  Machine.procedure(Increment, "Increment", (_req, state) =>
    Effect.sync(() => {
      const count = state + 1
      return [count, count]
    })),
  Machine.procedure(Decrement, "Decrement", (_req, state) =>
    Effect.sync(() => {
      const count = state - 1
      return [count, count]
    })),
  Machine.procedure(IncrementBy, "IncrementBy", (req, state) =>
    Effect.sync(() => {
      const count = state + req.number
      return [count, count]
    })),
  Machine.procedure(
    FailBackground,
    "FailBackground",
    (_req, _, ctx) => ctx.forkWithState(Effect.fail("error"))
  )
)

class Multiplier extends Context.Tag("Multiplier")<Multiplier, number>() {
  static Live = Layer.succeed(this, 2)
}

const withContext = Machine.make<number>()(
  (input: number, previous) =>
    Effect.gen(function*(_) {
      return [previous ?? input, yield* _(Layer.build(Multiplier.Live))]
    })
).pipe(
  Machine.procedure(Multiply, "Multiply", (_, state) =>
    Multiplier.pipe(
      Effect.map((m) => {
        const count = state * m
        return [count, count]
      })
    ))
)

const counterSerialized = Machine.toSerializable(counter, {
  state: Schema.NumberFromString,
  input: Schema.number
})

describe("Machine", () => {
  test("counter", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(counter, 0))
      assert.strictEqual(yield* _(booted.state), 0)
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new IncrementBy({ number: 2 }))), 4)
      assert.strictEqual(yield* _(booted.send(new Decrement())), 3)
      assert.strictEqual(yield* _(booted.send(new FailBackground())), undefined)
      const cause = yield* _(booted.join, Effect.sandbox, Effect.flip)
      assert.deepStrictEqual(cause, Cause.die("error"))
    }).pipe(Effect.scoped, Effect.runPromise))

  test("init context", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(withContext, 20))
      assert.strictEqual(yield* _(booted.state), 20)
      assert.strictEqual(yield* _(booted.send(new Multiply())), 40)
    }).pipe(Effect.scoped, Effect.runPromise))

  test("subscribe", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(counter, 0))
      const results: Array<number> = []
      yield* _(
        booted.subscribe,
        Effect.flatMap((q) =>
          q.take.pipe(
            Effect.tap((i) => {
              results.push(i)
            }),
            Effect.forever
          )
        ),
        Effect.fork
      )
      yield* _(Effect.yieldNow())
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new Increment())), 3)

      assert.deepStrictEqual(results, [1, 2, 3])
    }).pipe(Effect.scoped, Effect.runPromise))

  test("streamWithInitial", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(counter, 0))
      const results: Array<number> = []
      yield* _(
        booted.streamWithInitial,
        Stream.runForEach((i) =>
          Effect.sync(() => {
            results.push(i)
          })
        ),
        Effect.fork
      )
      yield* _(Effect.yieldNow())
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new Increment())), 3)

      assert.deepStrictEqual(results, [0, 1, 2, 3])
    }).pipe(Effect.scoped, Effect.runPromise))
})

describe("SerializableMachine", () => {
  test("counter", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(counterSerialized, 10))
      assert.strictEqual(yield* _(booted.state), 10)
      assert.strictEqual(yield* _(booted.send(new Increment())), 11)
      const snapshot = yield* _(Machine.snapshot(booted))
      assert.deepStrictEqual(snapshot, [10, "11"])

      const restored = yield* _(Machine.restore(counterSerialized, snapshot))
      assert.strictEqual(yield* _(restored.state), 11)
    }).pipe(Effect.scoped, Effect.runPromise))
})
