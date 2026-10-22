import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Layer, Logger, References, Result, Scope, Stream } from "effect"
import { CircuitBreaker } from "effect/persistence"
import { TestClock } from "effect/testing"
import * as CircuitBreakerTest from "./CircuitBreakerTest.ts"

CircuitBreakerTest.suite("memory", CircuitBreaker.layerStoreMemory, TestClock.adjust)

const storeError = new CircuitBreaker.CircuitBreakerError({
  reason: new CircuitBreaker.CircuitBreakerStoreError({ message: "store unavailable" })
})

const memoryStoreWith = (override: Partial<CircuitBreaker.CircuitBreakerStore["Service"]>) =>
  Layer.effect(
    CircuitBreaker.CircuitBreakerStore,
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      return { ...store, ...override }
    })
  ).pipe(Layer.provide(CircuitBreaker.layerStoreMemory()))

const captureLogs = () => {
  const reports: Array<{ readonly logLevel: string; readonly cause: Cause.Cause<unknown> }> = []
  const logger = Logger.make<unknown, void>((options) => {
    if (options.logLevel === "Warn" || options.logLevel === "Error") {
      reports.push({ logLevel: options.logLevel, cause: options.cause })
    }
  })
  return { reports, layer: Logger.layer([logger]) } as const
}

const causeOf = <A, E>(exit: Exit.Exit<A, E>) => Exit.isFailure(exit) ? exit.cause : assert.fail("Expected failure")

describe("CircuitBreaker", () => {
  describe("onStoreError", () => {
    const unavailable = memoryStoreWith({ admit: () => Effect.fail(storeError), state: () => Effect.fail(storeError) })

    it.effect("allow: an admit outage runs the call unrecorded and reports the cause at UnhandledLogLevel", () => {
      const { layer, reports } = captureLogs()
      return Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute"
        })
        const result = yield* Effect.succeed(42).pipe(breaker.execute({ key: "allow" }))

        assert.strictEqual(result, 42)
        assert.strictEqual(reports.length, 1)
        // UnhandledLogLevel defaults to Error.
        assert.strictEqual(reports[0].logLevel, "Error")
        assert.deepStrictEqual(Cause.findError(reports[0].cause), Result.succeed(storeError))
        const error = yield* Effect.flip(breaker.state("allow"))
        assert.strictEqual(error.reason._tag, "CircuitBreakerStoreError")
      }).pipe(Effect.provide(Layer.merge(unavailable, layer)))
    })

    it.effect("allow: an undefined UnhandledLogLevel silences the admit outage report", () => {
      const { layer, reports } = captureLogs()
      return Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute"
        })
        const result = yield* Effect.succeed(42).pipe(breaker.execute({ key: "silenced" }))

        assert.strictEqual(result, 42)
        assert.strictEqual(reports.length, 0)
      }).pipe(
        Effect.provideService(References.UnhandledLogLevel, undefined),
        Effect.provide(Layer.merge(unavailable, layer))
      )
    })

    it.effect("fail: an admit outage fails with CircuitBreakerStoreError without running the call", () =>
      Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute",
          onStoreError: "fail"
        })
        let ran = false
        const error = yield* Effect.sync(() => {
          ran = true
        }).pipe(breaker.execute({ key: "fail" }), Effect.flip)

        assert.isFalse(ran)
        assert.strictEqual(error.reason._tag, "CircuitBreakerStoreError")
      }).pipe(Effect.provide(unavailable)))

    it.effect("a failed record never replaces the result", () => {
      const { layer, reports } = captureLogs()
      return Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute",
          onStoreError: "fail"
        })
        const success = yield* Effect.succeed(42).pipe(breaker.execute({ key: "record" }))
        const failure = yield* Effect.fail("boom").pipe(breaker.execute({ key: "record" }), Effect.flip)

        assert.strictEqual(success, 42)
        assert.strictEqual(failure, "boom")
        assert.strictEqual(reports.length, 2)
      }).pipe(Effect.provide(Layer.merge(memoryStoreWith({ record: () => Effect.fail(storeError) }), layer)))
    })
  })

  describe("classify", () => {
    it.effect("a classifier defect records Ignored and the call dies with the combined cause", () =>
      Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute"
        })
        const thrown = yield* Effect.succeed(1).pipe(
          breaker.execute({
            key: "defect",
            classify: () => {
              throw "thrown"
            }
          }),
          Effect.exit
        )
        const died = yield* Effect.fail("boom").pipe(
          breaker.execute({ key: "defect", classify: () => Effect.die("died") }),
          Effect.exit
        )

        assert.deepStrictEqual(Cause.findDefect(causeOf(thrown)), Result.succeed("thrown"))
        assert.deepStrictEqual(Cause.findError(causeOf(died)), Result.succeed("boom"))
        assert.deepStrictEqual(Cause.findDefect(causeOf(died)), Result.succeed("died"))
        assert.strictEqual((yield* breaker.state("defect"))._tag, "Closed")
      }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory())))
  })

  it.effect("transitions ends when the breaker's scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const breaker = yield* CircuitBreaker.make({
        tripPolicy: CircuitBreaker.consecutive(1),
        openDuration: "1 minute"
      }).pipe(Scope.provide(scope))
      const transitions = yield* breaker.transitions.pipe(
        Stream.runCollect,
        Effect.forkChild({ startImmediately: true })
      )
      yield* Effect.fail("boom").pipe(breaker.execute({ key: "transitions" }), Effect.ignore)
      yield* Scope.close(scope, Exit.void)

      const collected = yield* Fiber.join(transitions)
      assert.deepStrictEqual(collected.map(({ from, to }) => [from, to]), [["Closed", "Open"]])
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory())))

  describe("memory retention", () => {
    it.effect("drops an idle Closed key", () =>
      Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(2),
          openDuration: "1 minute"
        })
        const fail = Effect.fail("boom").pipe(breaker.execute({ key: "idle" }), Effect.ignore)
        yield* fail
        yield* TestClock.adjust("2 minutes")
        yield* fail

        assert.strictEqual((yield* breaker.state("idle"))._tag, "Closed")
      }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory({ idleTimeToLive: "1 minute" }))))

    it.effect("keeps an Open key past idleTimeToLive until openUntil", () =>
      Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "2 hours"
        })
        yield* Effect.fail("boom").pipe(breaker.execute({ key: "open" }), Effect.ignore)
        yield* TestClock.adjust("90 minutes")

        const state = yield* breaker.state("open")
        assert.strictEqual(state._tag, "Open")
        assert.strictEqual(state._tag === "Open" && state.consecutiveOpenings, 1)
      }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory({ idleTimeToLive: "1 minute" }))))

    it.effect("fences a permit admitted before its key was dropped and recreated", () =>
      Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "1 minute"
        })
        const gate = yield* Deferred.make<void>()
        const admitted = yield* Deferred.make<void>()
        const stale = yield* Deferred.succeed(admitted, undefined).pipe(
          Effect.andThen(Deferred.await(gate)),
          Effect.andThen(Effect.fail("boom")),
          breaker.execute({ key: "recreated" }),
          Effect.forkChild
        )
        yield* Deferred.await(admitted)
        yield* TestClock.adjust("2 minutes")
        yield* Effect.void.pipe(breaker.execute({ key: "recreated" }))

        yield* Deferred.succeed(gate, undefined)
        yield* Fiber.await(stale)
        assert.strictEqual((yield* breaker.state("recreated"))._tag, "Closed")
      }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory({ idleTimeToLive: "1 minute" }))))
  })
})
