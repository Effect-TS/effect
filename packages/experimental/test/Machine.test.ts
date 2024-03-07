import * as DevTools from "@effect/experimental/DevTools"
import * as Machine from "@effect/experimental/Machine"
import { Schema } from "@effect/schema"
import { Cause, Chunk, Context, Deferred, Effect, Exit, Layer, Stream } from "effect"
import { assert, describe, test } from "vitest"

class Increment extends Schema.TaggedRequest<Increment>()("Increment", Schema.never, Schema.number, {}) {}
class Decrement extends Schema.TaggedRequest<Decrement>()("Decrement", Schema.never, Schema.number, {}) {}
class IncrementBy extends Schema.TaggedRequest<IncrementBy>()("IncrementBy", Schema.never, Schema.number, {
  number: Schema.number
}) {}
class DelayedIncrementBy
  extends Schema.TaggedRequest<DelayedIncrementBy>()("DelayedIncrementBy", Schema.never, Schema.void, {
    delay: Schema.Positive,
    number: Schema.number
  })
{}
class Multiply extends Schema.TaggedRequest<Multiply>()("Multiply", Schema.never, Schema.number, {}) {}

class FailBackground extends Schema.TaggedRequest<FailBackground>()("FailBackground", Schema.never, Schema.void, {}) {}

const counter = Machine.make(
  (input: number, previous?: number) =>
    Machine.procedures.make(previous ?? input, `Counter(${input})`).pipe(
      Machine.procedures.add(Increment, "Increment", (_req, state) =>
        Effect.sync(() => {
          const count = state + 1
          return [count, count]
        })),
      Machine.procedures.add(Decrement, "Decrement", (_req, state) =>
        Effect.sync(() => {
          const count = state - 1
          return [count, count]
        })),
      Machine.procedures.add(IncrementBy, "IncrementBy", (req, state) =>
        Effect.sync(() => {
          const count = state + req.number
          return [count, count]
        })),
      Machine.procedures.add(
        FailBackground,
        "FailBackground",
        (_req, state, ctx) => ctx.forkWith(Effect.fail("error"), state)
      )
    )
)

const delayedCounter = Machine.make(
  (input: number, previous?: number) =>
    Machine.procedures.make(previous ?? input, `Counter(${input})`).pipe(
      Machine.procedures.addPrivate(IncrementBy, "IncrementBy", (req, state) =>
        Effect.sync(() => {
          const count = state + req.number
          return [count, count]
        })),
      Machine.procedures.add(
        DelayedIncrementBy,
        "DelayedIncrementBy",
        (req, state, ctx) =>
          ctx.sendAwait(new IncrementBy({ number: req.number })).pipe(
            Effect.delay(req.delay),
            ctx.forkWith(state)
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
        Machine.procedures.add(Multiply, "Multiply", (_req, state) =>
          Effect.sync(() => {
            const count = state * multiplier
            return [count, count]
          }))
      )
    })
)

const timerLoop = Machine.make(
  Machine.procedures.make(0).pipe(
    Machine.procedures.addPrivate(
      Increment,
      "Increment",
      (_, state, ctx) =>
        ctx.send(new Increment()).pipe(
          Effect.delay(20),
          ctx.forkOne("timer"),
          Effect.as([state + 1, state + 1])
        )
    )
  )
).pipe(
  Machine.addInitializer((_, ctx) => ctx.send(new Increment()))
)

const deferReply = Machine.make(
  Machine.procedures.make(0).pipe(
    Machine.procedures.add(
      Increment,
      "Increment",
      (_, state, ctx, d) => {
        const count = state + 1
        return Deferred.succeed(d, count).pipe(
          Effect.delay(10),
          ctx.fork,
          Effect.as([Machine.NoReply, count])
        )
      }
    )
  )
)

const counterSerialized = Machine.toSerializable(counter, {
  state: Schema.NumberFromString,
  input: Schema.number
})

describe("Machine", () => {
  test("counter", () =>
    Effect.gen(function*(_) {
      yield* _(Effect.sleep(1000)) // wait for DevTools
      const booted = yield* _(Machine.boot(counter, 0))
      yield* _(Effect.sleep(10))
      assert.strictEqual(yield* _(booted.state), 0)
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new IncrementBy({ number: 2 }))), 4)
      assert.strictEqual(yield* _(booted.send(new Decrement())), 3)
      assert.deepStrictEqual(yield* _(booted.sendUnknown({ _tag: "Decrement" })), {
        _tag: "Success",
        value: 2
      })
      assert.strictEqual(yield* _(booted.send(new FailBackground())), undefined)
      const cause = yield* _(booted.join, Effect.sandbox, Effect.flip)
      const failure = Cause.failures(cause).pipe(Chunk.unsafeHead)
      assert.deepStrictEqual(failure.cause, Cause.die("error"))
    }).pipe(Effect.scoped, Machine.withTracingEnabled(true), Effect.provide(DevTools.layer()), Effect.runPromise))

  test("init context", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(withContext, 20))
      assert.strictEqual(yield* _(booted.state), 20)
      assert.strictEqual(yield* _(booted.send(new Multiply())), 40)
    }).pipe(
      Effect.scoped,
      Effect.provide(Multiplier.Live),
      Effect.runPromise
    ))

  test("forkWithState", () =>
    Effect.gen(function*(_) {
      const booted = yield* _(Machine.boot(delayedCounter, 2))
      assert.strictEqual(yield* _(booted.state), 2)
      assert.deepStrictEqual(
        // @ts-expect-error
        yield* _(booted.send(new IncrementBy({ number: 2 })), Effect.exit),
        Exit.die("Request IncrementBy marked as internal")
      )
      assert.strictEqual(yield* _(booted.send(new DelayedIncrementBy({ number: 2, delay: 10 }))), undefined)
      assert.strictEqual(yield* _(booted.state), 2)
      yield* _(Effect.sleep(10))
      assert.strictEqual(yield* _(booted.state), 4)
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
      yield* _(Effect.sleep(0))
      assert.strictEqual(yield* _(booted.send(new Increment())), 1)
      assert.strictEqual(yield* _(booted.send(new Increment())), 2)
      assert.strictEqual(yield* _(booted.send(new Increment())), 3)

      assert.deepStrictEqual(results, [0, 1, 2, 3])
    }).pipe(Effect.scoped, Effect.runPromise))

  test("addInitializer", () =>
    Effect.gen(function*(_) {
      const actor = yield* _(Machine.boot(timerLoop))
      const results = yield* _(
        actor.streamWithInitial,
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
      const actor = yield* _(Machine.boot(counterSerialized, 10))

      assert.strictEqual(yield* _(actor.state), 10)
      assert.strictEqual(yield* _(actor.send(new Increment())), 11)
      const snapshot = yield* _(Machine.snapshot(actor))
      assert.deepStrictEqual(snapshot, [10, "11"])

      const restored = yield* _(Machine.restore(counterSerialized, snapshot))
      assert.strictEqual(yield* _(restored.state), 11)
    }).pipe(Effect.scoped, Effect.runPromise))
})
