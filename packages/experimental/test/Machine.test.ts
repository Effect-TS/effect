import * as DevTools from "@effect/experimental/DevTools"
import * as Machine from "@effect/experimental/Machine"
import { assert, describe, test } from "@effect/vitest"
import { Cause, Chunk, Context, Deferred, Effect, Exit, Layer, Schema, Stream } from "effect"

class Increment
  extends Schema.TaggedRequest<Increment>()("Increment", { failure: Schema.Never, success: Schema.Number, payload: {} })
{}
class Decrement
  extends Schema.TaggedRequest<Decrement>()("Decrement", { failure: Schema.Never, success: Schema.Number, payload: {} })
{}
class IncrementBy extends Schema.TaggedRequest<IncrementBy>()("IncrementBy", {
  failure: Schema.Never,
  success: Schema.Number,
  payload: {
    number: Schema.Number
  }
}) {}
class DelayedIncrementBy extends Schema.TaggedRequest<DelayedIncrementBy>()("DelayedIncrementBy", {
  failure: Schema.Never,
  success: Schema.Void,
  payload: {
    delay: Schema.Positive,
    number: Schema.Number
  }
}) {}
class Multiply
  extends Schema.TaggedRequest<Multiply>()("Multiply", { failure: Schema.Never, success: Schema.Number, payload: {} })
{}

class FailBackground extends Schema.TaggedRequest<FailBackground>()("FailBackground", {
  failure: Schema.Never,
  success: Schema.Void,
  payload: {}
}) {}

const counter = Machine.makeWith<number, number>()(
  (input, previous) =>
    Machine.procedures.make(previous ?? input, {
      identifier: `Counter(${input})`
    }).pipe(
      Machine.procedures.add<Increment>()("Increment", ({ state }) =>
        Effect.sync(() => {
          const count = state + 1
          return [count, count]
        })),
      Machine.procedures.add<Decrement>()("Decrement", ({ state }) =>
        Effect.sync(() => {
          const count = state - 1
          return [count, count]
        })),
      Machine.procedures.add<IncrementBy>()("IncrementBy", ({ request, state }) =>
        Effect.sync(() => {
          const count = state + request.number
          return [count, count]
        })),
      Machine.procedures.add<FailBackground>()(
        "FailBackground",
        ({ forkWith, state }) => forkWith(Effect.fail("error"), state)
      )
    )
)

const counterSerializable = Machine.makeSerializable(
  { state: Schema.NumberFromString, input: Schema.Number },
  (input, previous) =>
    Machine.serializable.make(previous ?? input, {
      identifier: `Counter(${input})`
    }).pipe(
      Machine.serializable.add(Increment, ({ state }) =>
        Effect.sync(() => {
          const count = state + 1
          return [count, count]
        })),
      Machine.serializable.add(Decrement, ({ state }) =>
        Effect.sync(() => {
          const count = state - 1
          return [count, count]
        })),
      Machine.serializable.add(IncrementBy, ({ request, state }) =>
        Effect.sync(() => {
          const count = state + request.number
          return [count, count]
        })),
      Machine.serializable.add(
        FailBackground,
        ({ forkWith, state }) => forkWith(Effect.fail("error"), state)
      )
    )
)

const delayedCounter = Machine.makeWith<number, number>()(
  (input, previous) =>
    Machine.procedures.make(previous ?? input, {
      identifier: `Counter(${input})`
    }).pipe(
      Machine.procedures.addPrivate<IncrementBy>()("IncrementBy", ({ request, state }) =>
        Effect.sync(() => {
          const count = state + request.number
          return [count, count]
        })),
      Machine.procedures.add<DelayedIncrementBy>()(
        "DelayedIncrementBy",
        ({ forkWith, request, sendAwait, state }) =>
          sendAwait(new IncrementBy({ number: request.number })).pipe(
            Effect.delay(request.delay),
            forkWith(state)
          )
      )
    )
)

class Multiplier extends Context.Tag("Multiplier")<Multiplier, number>() {
  static Live = Layer.succeed(this, 2)
}

const withContext = Machine.make(
  (input: number, previous?: number) =>
    Effect.gen(function*(_) {
      const multiplier = yield* _(Multiplier)
      return Machine.procedures.make(previous ?? input).pipe(
        Machine.procedures.add<Multiply>()("Multiply", ({ state }) =>
          Effect.sync(() => {
            const count = state * multiplier
            return [count, count]
          }))
      )
    })
)

const timerLoop = Machine.make(
  Effect.gen(function*(_) {
    const { unsafeSend } = yield* _(Machine.MachineContext)

    // queue initial message
    yield* _(unsafeSend(new Increment()))

    return Machine.procedures.make(0).pipe(
      Machine.procedures.addPrivate<Increment>()(
        "Increment",
        (ctx) =>
          ctx.send(new Increment()).pipe(
            Effect.delay(20),
            ctx.forkOne("timer"),
            Effect.as([ctx.state + 1, ctx.state + 1])
          )
      )
    )
  })
)

const deferReply = Machine.make(
  Machine.procedures.make(0).pipe(
    Machine.procedures.add<Increment>()(
      "Increment",
      (ctx) => {
        const count = ctx.state + 1
        return Deferred.succeed(ctx.deferred, count).pipe(
          Effect.delay(10),
          ctx.fork,
          Effect.as([Machine.NoReply, count])
        )
      }
    )
  )
)

describe("Machine", () => {
  test("counter", () =>
    Effect.gen(function*(_) {
      yield* _(Effect.sleep(500)) // wait for DevTools

      const booted = yield* _(Machine.boot(counter, 0))
      yield* _(Effect.sleep(10))
      assert.strictEqual(yield* _(booted.get), 0)
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new IncrementBy({ number: 2 }))), 4)
      assert.strictEqual(yield* _(booted.send(new Decrement())), 3)
      assert.strictEqual(yield* _(booted.send(new FailBackground())), undefined)
      const cause = yield* _(booted.join, Effect.sandbox, Effect.flip)
      const failure = Cause.failures(cause).pipe(Chunk.unsafeHead)
      assert.deepStrictEqual(failure.cause, "error")
    }).pipe(Effect.scoped, Machine.withTracingEnabled(true), Effect.provide(DevTools.layer()), Effect.runPromise))

  test("init context", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(withContext, 20))
      assert.strictEqual(yield* _(booted.get), 20)
      assert.strictEqual(yield* _(booted.send(new Multiply())), 40)
    }).pipe(
      Effect.scoped,
      Effect.provide(Multiplier.Live),
      Effect.runPromise
    ))

  test("forkWithState", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(delayedCounter, 2))
      assert.strictEqual(yield* _(booted.get), 2)
      assert.deepStrictEqual(
        // @ts-expect-error
        yield* _(booted.send(new IncrementBy({ number: 2 })), Effect.exit),
        Exit.die("Request IncrementBy marked as internal")
      )
      assert.strictEqual(yield* _(booted.send(new DelayedIncrementBy({ number: 2, delay: 10 }))), undefined)
      assert.strictEqual(yield* _(booted.get), 2)
      yield* _(Effect.sleep(10))
      assert.strictEqual(yield* _(booted.get), 4)
    }).pipe(Effect.scoped, Effect.runPromise))

  test("changes", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(counter, 0))
      const results: Array<number> = []
      yield* _(
        booted.changes,
        Stream.runForEach((i) =>
          Effect.sync(() => {
            results.push(i)
          })
        ),
        Effect.fork
      )
      yield* _(Effect.sleep(0))
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new Increment())), 3)

      assert.deepStrictEqual(results, [0, 1, 2, 3])
    }).pipe(Effect.scoped, Effect.runPromise))

  test("unsafeSend initializer", () =>
    Effect.gen(function*(_) {
      const actor = yield* _(Machine.boot(timerLoop))
      const results = yield* _(
        actor.changes,
        Stream.take(5),
        Stream.runCollect
      )
      assert.deepStrictEqual(Chunk.toReadonlyArray(results), [0, 1, 2, 3, 4])
    }).pipe(Effect.scoped, Effect.runPromise))

  test("NoReply", () =>
    Effect.gen(function*(_) {
      const actor = yield* _(Machine.boot(deferReply))
      assert.strictEqual(yield* _(actor.send(new Increment())), 1)
    }).pipe(Effect.scoped, Effect.runPromise))
})

describe("SerializableMachine", () => {
  test("counter", () =>
    Effect.gen(function*(_) {
      const actor = yield* _(Machine.boot(counterSerializable, 10))

      assert.strictEqual(yield* _(actor.get), 10)
      assert.strictEqual(yield* _(actor.send(new Increment())), 11)
      assert.strictEqual(yield* _(actor.send(new Increment())), 12)
      assert.deepStrictEqual(yield* _(actor.sendUnknown({ _tag: "Decrement" })), {
        _tag: "Success",
        value: 11
      })
      const snapshot = yield* _(Machine.snapshot(actor))
      assert.deepStrictEqual(snapshot, [10, "11"])

      const restored = yield* _(Machine.restore(counterSerializable, snapshot))
      assert.strictEqual(yield* _(restored.get), 11)
    }).pipe(Effect.scoped, Effect.runPromise))
})
