import * as EffectWorker from "@effect/platform-browser/Worker"
import "@vitest/web-worker"
import { Chunk, Effect, Option, Stream } from "effect"
import { assert, describe, it } from "vitest"
import type { WorkerMessage } from "./fixtures/schema.js"
import { GetPersonById, GetSpan, GetUserById, InitialMessage, Person, User } from "./fixtures/schema.js"

describe.sequential("Worker", () => {
  it("executes streams", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(EffectWorker.makePool<number, never, number>({
        spawn: () => new globalThis.Worker(new URL("./fixtures/worker.ts", import.meta.url)),
        size: 1
      }))
      const items = yield* _(pool.execute(99), Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(
      Effect.scoped,
      Effect.provide(EffectWorker.layerManager),
      Effect.runPromise
    ))

  it("Serialized", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(EffectWorker.makePoolSerialized({
        spawn: () => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)),
        size: 1
      }))
      const people = yield* _(pool.execute(new GetPersonById({ id: 123 })), Stream.runCollect)
      assert.deepStrictEqual(Chunk.toReadonlyArray(people), [
        new Person({ id: 123, name: "test" }),
        new Person({ id: 123, name: "ing" })
      ])
    }).pipe(
      Effect.scoped,
      Effect.provide(EffectWorker.layerManager),
      Effect.runPromise
    ))

  it("Serialized with initialMessage", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(EffectWorker.makePoolSerialized<WorkerMessage>({
        spawn: () => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)),
        size: 1,
        initialMessage: () => new InitialMessage({ name: "custom" })
      }))
      let user = yield* _(pool.executeEffect(new GetUserById({ id: 123 })))
      user = yield* _(pool.executeEffect(new GetUserById({ id: 123 })))
      assert.deepStrictEqual(user, new User({ id: 123, name: "custom" }))
      const people = yield* _(pool.execute(new GetPersonById({ id: 123 })), Stream.runCollect)
      assert.deepStrictEqual(Chunk.toReadonlyArray(people), [
        new Person({ id: 123, name: "test" }),
        new Person({ id: 123, name: "ing" })
      ])
    }).pipe(
      Effect.scoped,
      Effect.provide(EffectWorker.layerManager),
      Effect.runPromise
    ))

  it("tracing", () =>
    Effect.gen(function*(_) {
      const parentSpan = yield* _(Effect.currentSpan)
      const pool = yield* _(EffectWorker.makePoolSerialized({
        spawn: () => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)),
        size: 1
      }))
      const span = yield* _(pool.executeEffect(new GetSpan()))
      assert.deepStrictEqual(
        span.parent,
        Option.some({
          traceId: parentSpan.traceId,
          spanId: parentSpan.spanId
        })
      )
    }).pipe(
      Effect.withSpan("test"),
      Effect.scoped,
      Effect.provide(EffectWorker.layerManager),
      Effect.runPromise
    ))

  it("SharedWorker", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(EffectWorker.makePool<number, never, number>({
        spawn: () => new globalThis.SharedWorker(new URL("./fixtures/worker.ts", import.meta.url)),
        size: 1
      }))
      const items = yield* _(pool.execute(99), Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(
      Effect.scoped,
      Effect.provide(EffectWorker.layerManager),
      Effect.runPromise
    ))

  // TODO: vitest/web-worker doesn't support postMessage throwing errors
  // it("send error", () =>
  //   Effect.gen(function*(_) {
  //     const pool = yield* _(EffectWorker.makePool<number, never, number>({
  //       spawn: () => new globalThis.Worker(new URL("./fixtures/worker.ts", import.meta.url)),
  //       transfers(_message) {
  //         return [new Uint8Array([1, 2, 3])]
  //       },
  //       size: 1
  //     }))
  //     const items = yield* _(pool.execute(99), Stream.runCollect, Effect.flip)
  //     console.log(items)
  //   }).pipe(Effect.scoped, Effect.provide(EffectWorker.layerManager), Effect.runPromise))
})
