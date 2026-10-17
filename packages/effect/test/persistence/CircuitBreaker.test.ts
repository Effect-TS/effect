import { assert, describe, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Exit, Fiber, Logger, Metric, Random, Ref, References, Tracer } from "effect"
import * as CircuitBreaker from "effect/persistence/CircuitBreaker"
import { TestClock } from "effect/testing"
import * as CircuitBreakerTest from "./CircuitBreakerTest.ts"

CircuitBreakerTest.suite("memory", CircuitBreaker.layerStoreMemory)

// Polling cadence is breaker logic; with a store that has probe leases, large TestClock
// steps would also expire the probe lease.
describe("CircuitBreaker waiting", () => {
  it.effect("waits for fresh transitions and caps half-open polling at five seconds", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const acquires = yield* Ref.make(0)
      const breaker = yield* CircuitBreaker.make({
        key: "wait-polling",
        policy: CircuitBreaker.consecutiveFailures(1),
        openFor: "1 second"
      }).pipe(
        Effect.provideService(CircuitBreaker.CircuitBreakerStore, {
          ...store,
          acquire: (options) => Effect.andThen(Ref.update(acquires, (n) => n + 1), store.acquire(options))
        })
      )
      yield* Effect.flip(breaker.execute(Effect.fail("open")))
      const worker = yield* breaker.execute(Effect.void, { onRejected: "wait" }).pipe(Effect.forkScoped)
      yield* TestClock.withLive(Effect.sleep("10 millis"))
      yield* TestClock.adjust("1 second")
      const release = yield* Deferred.make<void>()
      const probe = yield* breaker.execute(Deferred.await(release)).pipe(Effect.forkScoped)
      yield* TestClock.withLive(Effect.sleep("10 millis"))
      yield* Ref.set(acquires, 0)
      yield* TestClock.adjust("100 millis")
      yield* TestClock.withLive(Effect.sleep("10 millis"))
      assert.strictEqual(yield* Ref.get(acquires), 1)
      let expected = 1
      for (const delay of [100, 200, 400, 800, 1_600, 3_200, 5_000, 5_000]) {
        yield* TestClock.adjust(delay - 1)
        yield* TestClock.withLive(Effect.sleep("10 millis"))
        assert.strictEqual(yield* Ref.get(acquires), expected)
        yield* TestClock.adjust(1)
        yield* TestClock.withLive(Effect.sleep("10 millis"))
        expected++
        assert.strictEqual(yield* Ref.get(acquires), expected)
      }
      yield* Deferred.succeed(release, undefined)
      yield* TestClock.withLive(Effect.sleep("10 millis"))
      yield* Fiber.join(probe)
      yield* Fiber.join(worker)
    }).pipe(
      Effect.provideService(Random.Random, { nextDoubleUnsafe: () => 1, nextIntUnsafe: () => 0 }),
      Effect.provide(CircuitBreaker.layerStoreMemory)
    ))

  it.effect("fails closed on store errors while waiting without starting work", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const calls = yield* Ref.make(0)
      const error = new CircuitBreaker.CircuitBreakerError({
        reason: new CircuitBreaker.CircuitBreakerStoreError({ message: "offline" })
      })
      const breaker = yield* CircuitBreaker.make({
        key: "wait-store-failure",
        policy: CircuitBreaker.consecutiveFailures(1),
        openFor: "1 second"
      }).pipe(Effect.provideService(CircuitBreaker.CircuitBreakerStore, {
        ...store,
        acquire: () => Effect.fail(error)
      }))
      assert.strictEqual(
        yield* Effect.flip(breaker.execute(Ref.update(calls, (n) => n + 1), {
          onRejected: "wait"
        })),
        error
      )
      assert.strictEqual(yield* Ref.get(calls), 0)
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
})

describe("CircuitBreaker policies", () => {
  it("normalizes consecutive failure counts", () => {
    for (const [input, failures] of [[0, 1], [-2, 1], [2.9, 2], [3, 3]]) {
      assert.deepStrictEqual(CircuitBreaker.consecutiveFailures(input), { _tag: "ConsecutiveFailures", failures })
    }
  })

  it("uses failure-rate defaults", () => {
    assert.deepStrictEqual(CircuitBreaker.failureRate({ threshold: 0.5, window: "10 seconds" }), {
      _tag: "FailureRate",
      threshold: 0.5,
      minimumCalls: 10,
      window: Duration.seconds(10),
      buckets: 10
    })
  })

  it("bounds and truncates failure-rate options", () => {
    assert.deepStrictEqual(
      CircuitBreaker.failureRate({
        threshold: 2,
        minimumCalls: 2.9,
        window: Duration.zero,
        buckets: 3.9
      }),
      {
        _tag: "FailureRate",
        threshold: 1,
        minimumCalls: 2,
        window: Duration.millis(1),
        buckets: 3
      }
    )
    assert.deepStrictEqual(
      CircuitBreaker.failureRate({
        threshold: 0,
        minimumCalls: -1,
        window: "1 second",
        buckets: 0
      }),
      {
        _tag: "FailureRate",
        threshold: Number.MIN_VALUE,
        minimumCalls: 1,
        window: Duration.seconds(1),
        buckets: 1
      }
    )
  })
})

describe("CircuitBreaker execute", () => {
  it.effect("execute supports data-first and pipeable calls", () =>
    Effect.gen(function*() {
      const breaker = yield* CircuitBreaker.make({
        key: `dual:${crypto.randomUUID()}`,
        policy: CircuitBreaker.consecutiveFailures(1),
        openFor: "1 second"
      })
      assert.strictEqual(yield* CircuitBreaker.execute(Effect.succeed(1), breaker), 1)
      assert.strictEqual(yield* Effect.succeed(2).pipe(CircuitBreaker.execute(breaker)), 2)
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
})

describe("CircuitBreaker memory store", () => {
  it.effect("reclaims idle memory entries without reusing generations or retaining stale records", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const key = `cleanup:${crypto.randomUUID()}`
      const acquire = store.acquire({ key, halfOpenPermits: 1 })
      const first = yield* acquire
      if (first._tag !== "Permitted") return assert.fail("Expected permit")
      const record = (permit: CircuitBreaker.Permit) =>
        store.record({
          key,
          permit,
          outcome: "success",
          policy: CircuitBreaker.consecutiveFailures(1),
          halfOpenSuccesses: 1,
          openForMillis: 1_000
        })
      yield* record(first.permit)
      assert.deepStrictEqual(yield* store.state(key), { _tag: "Closed", generation: 0 })
      const second = yield* acquire
      if (second._tag !== "Permitted") return assert.fail("Expected permit")
      assert.isAbove(second.permit.generation, first.permit.generation)
      yield* record(second.permit)
      yield* record(first.permit)
      assert.deepStrictEqual(yield* store.state(key), { _tag: "Closed", generation: 0 })
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))

  it.effect("keeps memory entries while closed calls are outstanding", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const key = `outstanding:${crypto.randomUUID()}`
      const first = yield* store.acquire({ key, halfOpenPermits: 1 })
      const second = yield* store.acquire({ key, halfOpenPermits: 1 })
      if (first._tag !== "Permitted" || second._tag !== "Permitted") return assert.fail("Expected permits")
      const record = (permit: CircuitBreaker.Permit, outcome: CircuitBreaker.Outcome) =>
        store.record({
          key,
          permit,
          outcome,
          policy: CircuitBreaker.consecutiveFailures(2),
          halfOpenSuccesses: 1,
          openForMillis: 1_000
        })
      yield* record(first.permit, "success")
      assert.deepStrictEqual(yield* store.state(key), { _tag: "Closed", generation: second.permit.generation })
      yield* record(second.permit, "failure")
      const third = yield* store.acquire({ key, halfOpenPermits: 1 })
      if (third._tag !== "Permitted") return assert.fail("Expected permit")
      yield* record(third.permit, "failure")
      assert.strictEqual((yield* store.state(key))._tag, "Open")
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))

  it.effect("reclaims memory entries after their failure-rate buckets expire", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const key = `expired:${crypto.randomUUID()}`
      const first = yield* store.acquire({ key, halfOpenPermits: 1 })
      const second = yield* store.acquire({ key, halfOpenPermits: 1 })
      if (first._tag !== "Permitted" || second._tag !== "Permitted") return assert.fail("Expected permits")
      const record = (permit: CircuitBreaker.Permit, outcome: CircuitBreaker.Outcome) =>
        store.record({
          key,
          permit,
          outcome,
          policy: CircuitBreaker.failureRate({ threshold: 1, minimumCalls: 2, window: "1 second" }),
          halfOpenSuccesses: 1,
          openForMillis: 1_000
        })
      yield* record(first.permit, "success")
      assert.deepStrictEqual(yield* store.state(key), { _tag: "Closed", generation: first.permit.generation })
      yield* TestClock.adjust("1 second")
      yield* record(second.permit, "ignored")
      assert.deepStrictEqual(yield* store.state(key), { _tag: "Closed", generation: 0 })
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
})

describe("CircuitBreaker probe lease renewal", () => {
  for (const outcome of ["success", "failure", "interrupted"] as const) {
    it.effect(`stops probe lease renewal after ${outcome}`, () =>
      Effect.gen(function*() {
        const store = yield* CircuitBreaker.CircuitBreakerStore
        const started = yield* Deferred.make<void>()
        const stopped = yield* Ref.make(false)
        const breaker = yield* CircuitBreaker.make({
          key: `keep-alive:${outcome}:${crypto.randomUUID()}`,
          policy: CircuitBreaker.consecutiveFailures(1),
          openFor: "1 second"
        }).pipe(Effect.provideService(CircuitBreaker.CircuitBreakerStore, {
          ...store,
          renewProbeLease: () =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Ref.set(stopped, true))
            )
        }))
        yield* Effect.flip(breaker.execute(Effect.fail("open")))
        yield* TestClock.adjust("1 second")
        const work = Effect.gen(function*() {
          yield* Deferred.await(started)
          if (outcome === "failure") return yield* Effect.fail("original")
          if (outcome === "interrupted") return yield* Effect.never
          return "original"
        })
        const fiber = yield* breaker.execute(work).pipe(Effect.exit, Effect.forkScoped)
        if (outcome === "interrupted") {
          yield* Deferred.await(started)
          yield* Fiber.interrupt(fiber)
        } else {
          const exit = yield* Fiber.join(fiber)
          if (outcome === "success") assert.deepStrictEqual(exit, Exit.succeed("original"))
          else assert.deepStrictEqual(exit, Exit.fail("original"))
        }
        assert.isTrue(yield* Ref.get(stopped))
      }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
  }

  it.effect("keeps the user's result when probe lease renewal fails", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const failed = yield* Deferred.make<void>()
      const error = new CircuitBreaker.CircuitBreakerError({
        reason: new CircuitBreaker.CircuitBreakerStoreError({ message: "offline" })
      })
      const breaker = yield* CircuitBreaker.make({
        key: `keep-alive-failure:${crypto.randomUUID()}`,
        policy: CircuitBreaker.consecutiveFailures(1),
        openFor: "1 second"
      }).pipe(Effect.provideService(CircuitBreaker.CircuitBreakerStore, {
        ...store,
        renewProbeLease: () => Deferred.succeed(failed, undefined).pipe(Effect.andThen(Effect.fail(error)))
      }))
      yield* Effect.flip(breaker.execute(Effect.fail("open")))
      yield* TestClock.adjust("1 second")
      assert.strictEqual(yield* breaker.execute(Deferred.await(failed).pipe(Effect.as("original"))), "original")
      assert.strictEqual((yield* breaker.state)._tag, "Closed")
    }).pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
})

const telemetryOptions = {
  key: "telemetry",
  policy: CircuitBreaker.consecutiveFailures(1),
  openFor: Duration.seconds(1)
}

const callCount = (name: string, outcome: string, attributes: Metric.Metric.AttributeSet = {}) =>
  Metric.value(CircuitBreaker.callsMetric.pipe(Metric.withAttributes({
    ...attributes,
    "circuit_breaker.name": name,
    "circuit_breaker.outcome": outcome
  }))).pipe(Effect.map((value) => value.count))

const telemetryTest = <A, E>(effect: Effect.Effect<A, E, CircuitBreaker.CircuitBreakerStore>) =>
  effect.pipe(
    Effect.provide(CircuitBreaker.layerStoreMemory),
    Effect.provideService(Metric.MetricRegistry, new Map())
  )

describe("CircuitBreaker telemetry", () => {
  it.effect("counts each classified call and returned rejection under the key by default", () =>
    Effect.gen(function*() {
      const breaker = yield* CircuitBreaker.make(telemetryOptions)
      const ignored = yield* CircuitBreaker.make({ ...telemetryOptions, classify: () => "ignored" })
      yield* breaker.execute(Effect.void)
      yield* ignored.execute(Effect.void)
      yield* Effect.flip(breaker.execute(Effect.fail("failure")))
      yield* Effect.flip(breaker.execute(Effect.void))
      for (const outcome of ["success", "failure", "ignored", "rejected"]) {
        assert.strictEqual(yield* callCount(telemetryOptions.key, outcome), 1)
      }
    }).pipe(telemetryTest))

  it.effect("counts acquire errors and preserves classified outcomes when recording fails", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const error = new CircuitBreaker.CircuitBreakerError({
        reason: new CircuitBreaker.CircuitBreakerStoreError({ message: "offline" })
      })
      const acquireFailure = yield* CircuitBreaker.make(telemetryOptions).pipe(
        Effect.provideService(CircuitBreaker.CircuitBreakerStore, { ...store, acquire: () => Effect.fail(error) })
      )
      assert.strictEqual(yield* Effect.flip(acquireFailure.execute(Effect.void)), error)
      assert.strictEqual(yield* callCount(telemetryOptions.key, "store_error"), 1)
      const span = yield* Effect.currentSpan
      assert.strictEqual(span.attributes.get("circuit_breaker.outcome"), "store_error")
      assert.strictEqual(span.attributes.get("circuit_breaker.rejected"), false)
      const recordFailure = yield* CircuitBreaker.make(telemetryOptions).pipe(
        Effect.provideService(CircuitBreaker.CircuitBreakerStore, { ...store, record: () => Effect.fail(error) })
      )
      assert.strictEqual(yield* recordFailure.execute(Effect.succeed("original")), "original")
      assert.strictEqual(yield* callCount(telemetryOptions.key, "success"), 1)
      assert.strictEqual(yield* callCount(telemetryOptions.key, "store_error"), 1)
    }).pipe(Effect.withSpan("store-error"), telemetryTest))

  it.effect("groups distinct keys by name and adds contextual metric attributes", () =>
    Effect.gen(function*() {
      for (const key of ["tenant:1", "tenant:2"]) {
        const breaker = yield* CircuitBreaker.make({ ...telemetryOptions, key, name: "dependency" })
        yield* breaker.execute(Effect.void)
      }
      assert.strictEqual(yield* callCount("dependency", "success", { region: "eu" }), 2)
    }).pipe(Effect.provideService(Metric.CurrentMetricAttributes, { region: "eu" }), telemetryTest))

  it.effect("counts local transitions and logs their destination-specific levels", () =>
    Effect.gen(function*() {
      const logs: Array<{ level: string; attributes: Record<string, unknown> }> = []
      const logger = Logger.make<unknown, void>((options) => {
        logs.push({ level: options.logLevel, attributes: options.fiber.getRef(References.CurrentLogAnnotations) })
      })
      yield* Effect.gen(function*() {
        const breaker = yield* CircuitBreaker.make(telemetryOptions)
        yield* Effect.flip(breaker.execute(Effect.fail("open")))
        yield* TestClock.adjust("1 second")
        yield* breaker.execute(Effect.void)
      }).pipe(
        Effect.annotateLogs({ app: "test" }),
        Effect.provideService(Metric.CurrentMetricAttributes, { app: "test" }),
        Effect.provide(Logger.layer([logger])),
        Effect.provideService(References.MinimumLogLevel, "Debug")
      )
      assert.deepStrictEqual(logs.map((log) => log.level), ["Warn", "Debug", "Info"])
      for (
        const [index, [from, to]] of [["closed", "open"], ["open", "half_open"], ["half_open", "closed"]].entries()
      ) {
        const attributes = {
          app: "test",
          "circuit_breaker.name": telemetryOptions.key,
          "circuit_breaker.state.from": from,
          "circuit_breaker.state.to": to
        }
        const value = yield* Metric.value(Metric.withAttributes(CircuitBreaker.transitionsMetric, attributes))
        assert.strictEqual(value.count, 1)
        const { "circuit_breaker.generation": generation, ...loggedAttributes } = logs[index].attributes
        assert.isNumber(generation)
        assert.deepStrictEqual(loggedAttributes, attributes)
      }
    }).pipe(telemetryTest))

  it.effect("annotates the current span and emits an event only for returned rejections", () =>
    Effect.gen(function*() {
      const breaker = yield* CircuitBreaker.make(telemetryOptions)
      const span = yield* Effect.currentSpan
      if (!(span instanceof Tracer.NativeSpan)) return assert.fail("Expected native span")
      yield* breaker.execute(Effect.void)
      assert.strictEqual(span.attributes.get("circuit_breaker.outcome"), "success")
      assert.strictEqual(span.attributes.get("circuit_breaker.rejected"), false)
      yield* Effect.flip(breaker.execute(Effect.fail("open")))
      assert.strictEqual(span.attributes.get("circuit_breaker.outcome"), "failure")
      assert.strictEqual(span.events.filter(([name]) => name === "effect.circuit_breaker.rejected").length, 0)
      yield* Effect.flip(breaker.execute(Effect.void))
      assert.strictEqual(span.attributes.get("circuit_breaker.name"), telemetryOptions.key)
      assert.strictEqual(span.attributes.get("circuit_breaker.outcome"), "rejected")
      assert.strictEqual(span.attributes.get("circuit_breaker.rejected"), true)
      const events = span.events.filter(([name]) => name === "effect.circuit_breaker.rejected")
      assert.strictEqual(events.length, 1)
      assert.deepStrictEqual(events[0][2], {
        "circuit_breaker.name": telemetryOptions.key,
        "circuit_breaker.state": "open"
      })
    }).pipe(Effect.withSpan("caller"), telemetryTest))

  it.effect("logs swallowed internal failures with the breaker name", () =>
    Effect.gen(function*() {
      const store = yield* CircuitBreaker.CircuitBreakerStore
      const logs: Array<{ message: unknown; attributes: Record<string, unknown> }> = []
      const logger = Logger.make<unknown, void>((options) => {
        logs.push({ message: options.message, attributes: options.fiber.getRef(References.CurrentLogAnnotations) })
      })
      const broken = yield* CircuitBreaker.make({ ...telemetryOptions, name: "diagnostic" }).pipe(
        Effect.provideService(CircuitBreaker.CircuitBreakerStore, { ...store, record: () => Effect.die("offline") })
      )
      assert.strictEqual(
        yield* broken.execute(Effect.succeed("original")).pipe(Effect.provide(Logger.layer([logger]))),
        "original"
      )
      assert.strictEqual(logs.length, 1)
      assert.deepStrictEqual(logs[0].message, ["Circuit breaker internal failure"])
      assert.strictEqual(logs[0].attributes["circuit_breaker.name"], "diagnostic")
      assert.strictEqual(logs[0].attributes["circuit_breaker.operation"], "record")
    }).pipe(telemetryTest))
})
