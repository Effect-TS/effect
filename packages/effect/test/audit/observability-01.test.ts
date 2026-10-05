import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Logger } from "effect"

// Logger.batched (packages/effect/src/Logger.ts:725-742): the JSDoc says that when the scope
// closes "the background process is interrupted and any remaining buffered entries are flushed".
// A batch already handed to an in-flight `flush` must not be lost by a normal scope close.
it.live("observability-01: closing a batched logger scope does not drop an in-flight flush", () =>
  Effect.gen(function*() {
    const output: Array<string> = []
    const started = yield* Deferred.make<void>()
    yield* Effect.scoped(Effect.gen(function*() {
      const logger = yield* Logger.batched(Logger.make((o) => String(o.message)), {
        window: 1,
        flush: (batch) =>
          Deferred.succeed(started, undefined).pipe(
            Effect.andThen(Effect.sleep(50)),
            Effect.andThen(Effect.sync(() => {
              output.push(...batch)
            }))
          )
      })
      yield* Effect.log("first").pipe(Effect.provideService(Logger.CurrentLoggers, new Set([logger])))
      yield* Deferred.await(started)
    }))
    assert.deepStrictEqual(output, ["first"])
  }))
