import * as BrowserWorker from "@effect/platform-browser/BrowserWorker"
import * as EffectWorker from "@effect/platform/Worker"
import "@vitest/web-worker"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Effect, Exit, Option, Stream } from "effect"
import type { WorkerMessage } from "./fixtures/schema.js"
import {
  GetPersonById,
  GetSpan,
  GetUserById,
  InitialMessage,
  Person,
  RunnerInterrupt,
  User
} from "./fixtures/schema.js"

describe.sequential("Worker", () => {
  it("executes streams", () =>
    Effect.gen(function*() {
      const pool = yield* EffectWorker.makePool<number, never, number>({
        size: 1
      })
      const items = yield* pool.execute(99).pipe(Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(
      Effect.scoped,
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.Worker(new URL("./fixtures/worker.ts", import.meta.url)))
      ),
      Effect.runPromise
    ))

  it("Serialized", () =>
    Effect.gen(function*() {
      const pool = yield* EffectWorker.makePoolSerialized({ size: 1 })
      const people = yield* pool.execute(new GetPersonById({ id: 123 })).pipe(Stream.runCollect)
      assert.deepStrictEqual(Chunk.toReadonlyArray(people), [
        new Person({ id: 123, name: "test", data: new Uint8Array([1, 2, 3]) }),
        new Person({ id: 123, name: "ing", data: new Uint8Array([4, 5, 6]) })
      ])
    }).pipe(
      Effect.scoped,
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)))
      ),
      Effect.runPromise
    ))

  it("Serialized with initialMessage", () =>
    Effect.gen(function*() {
      const pool = yield* EffectWorker.makePoolSerialized<WorkerMessage>({
        size: 1,
        initialMessage: () => new InitialMessage({ name: "custom", data: new Uint8Array([1, 2, 3]) })
      })
      const user = yield* pool.executeEffect(new GetUserById({ id: 123 }))
      assert.deepStrictEqual(user, new User({ id: 123, name: "custom" }))
      const people = yield* pool.execute(new GetPersonById({ id: 123 })).pipe(Stream.runCollect)
      assert.deepStrictEqual(Chunk.toReadonlyArray(people), [
        new Person({ id: 123, name: "test", data: new Uint8Array([1, 2, 3]) }),
        new Person({ id: 123, name: "ing", data: new Uint8Array([4, 5, 6]) })
      ])
    }).pipe(
      Effect.scoped,
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)))
      ),
      Effect.runPromise
    ))

  it("tracing", () =>
    Effect.gen(function*() {
      const parentSpan = yield* Effect.currentSpan
      const pool = yield* EffectWorker.makePoolSerialized({
        size: 1
      })
      const span = yield* pool.executeEffect(new GetSpan()).pipe(Effect.tapErrorCause(Effect.log))
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
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.Worker(new URL("./fixtures/serializedWorker.ts", import.meta.url)))
      ),
      Effect.runPromise
    ))

  it("SharedWorker", () =>
    Effect.gen(function*() {
      const pool = yield* EffectWorker.makePool<number, never, number>({
        size: 1
      })
      const items = yield* pool.execute(99).pipe(Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(
      Effect.scoped,
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.SharedWorker(new URL("./fixtures/worker.ts", import.meta.url)))
      ),
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

  it.scoped("interrupt runner", () =>
    Effect.gen(function*() {
      const pool = yield* EffectWorker.makePoolSerialized<WorkerMessage>({
        size: 1,
        initialMessage: () => new InitialMessage({ name: "custom", data: new Uint8Array([1, 2, 3]) })
      })

      const exit = yield* pool.execute(new RunnerInterrupt()).pipe(
        Stream.runDrain,
        Effect.exit
      )
      assert.isTrue(Exit.isInterrupted(exit))
    }).pipe(
      Effect.provide(
        BrowserWorker.layer(() =>
          new globalThis.SharedWorker(new URL("./fixtures/serializedWorker.ts", import.meta.url))
        )
      )
    ))
})
