import { assert, describe, it } from "@effect/vitest"
import {
  Cause,
  Clock,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  type Layer,
  Metric,
  Queue,
  Random,
  Ref,
  Schedule,
  Stream
} from "effect"
import * as CircuitBreaker from "effect/persistence/CircuitBreaker"
import { TestClock } from "effect/testing"

const open = (error: unknown) => {
  assert.isTrue(CircuitBreaker.isCircuitBreakerError(error))
  if (!CircuitBreaker.isCircuitBreakerError(error) || error.reason._tag !== "CircuitBreakerRejected") {
    return assert.fail("Expected CircuitBreakerRejected")
  }
  return error.reason
}

/**
 * Runs the circuit breaker contract against a store implementation.
 *
 * @stability unstable
 * @category tests
 * @since 4.1.0
 */
export const suite = (name: string, layer: Layer.Layer<CircuitBreaker.CircuitBreakerStore, unknown>) => {
  const key = (test: string) => `circuit-breaker:${name}:${test}:${crypto.randomUUID()}`
  const make = (test: string, options?: Partial<Omit<CircuitBreaker.Options<unknown>, "key">>) =>
    CircuitBreaker.make({
      key: key(test),
      policy: CircuitBreaker.consecutiveFailures(2),
      openFor: "1 second",
      ...options
    })

  // Tests with forked workers sleep 100 millis of real time so store I/O (real for Redis)
  // finishes and the workers reach their next TestClock sleep before the clock moves.
  it.layer(layer, { timeout: "30 seconds", concurrent: false })(`CircuitBreaker (${name})`, (it) => {
    describe("policies", () => {
      it.effect("opens after consecutive failures and resets the count on success", () =>
        Effect.gen(function*() {
          const breaker = yield* make("consecutive")
          assert.strictEqual(yield* Effect.flip(breaker.execute(Effect.fail("first"))), "first")
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* breaker.execute(Effect.void)
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* Effect.flip(breaker.execute(Effect.fail("third")))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
        }))

      it.effect("requires minimumCalls before evaluating the failure rate", () =>
        Effect.gen(function*() {
          const breaker = yield* make("minimum-calls", {
            policy: CircuitBreaker.failureRate({ threshold: 0.5, minimumCalls: 4, window: "10 seconds" })
          })
          yield* Effect.flip(breaker.execute(Effect.fail("failure")))
          yield* Effect.flip(breaker.execute(Effect.fail("failure")))
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Open")
          assert.deepStrictEqual(open(yield* Effect.flip(breaker.execute(Effect.void))).retryAfter, Duration.seconds(1))
        }))

      it.effect("drops failure-rate buckets after the window", () =>
        Effect.gen(function*() {
          const breaker = yield* make("window", {
            policy: CircuitBreaker.failureRate({ threshold: 0.5, minimumCalls: 4, window: "10 seconds", buckets: 10 })
          })
          yield* Effect.flip(breaker.execute(Effect.fail("old")))
          yield* Effect.flip(breaker.execute(Effect.fail("old")))
          yield* TestClock.adjust("10 seconds")
          yield* breaker.execute(Effect.void)
          yield* breaker.execute(Effect.void)
          yield* Effect.flip(breaker.execute(Effect.fail("new")))
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* Effect.flip(breaker.execute(Effect.fail("new")))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
        }))
    })

    describe("open", () => {
      it.effect("rejects open calls without executing them and reports the remaining delay", () =>
        Effect.gen(function*() {
          const breaker = yield* make("rejection", { openFor: "2 seconds" })
          const calls = yield* Ref.make(0)
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("500 millis")
          const reason = open(yield* Effect.flip(breaker.execute(Ref.update(calls, (n) => n + 1))))
          assert.strictEqual(reason.key, breaker.key)
          assert.strictEqual(reason.state, "Open")
          assert.deepStrictEqual(reason.retryAfter, Duration.millis(1_500))
          assert.strictEqual(yield* Ref.get(calls), 0)
        }))
    })

    describe("waiting", () => {
      it.effect("waits until retryAt before starting work", () =>
        Effect.gen(function*() {
          const breaker = yield* make("wait-open", { policy: CircuitBreaker.consecutiveFailures(1) })
          yield* Effect.flip(breaker.execute(Effect.fail("open")))
          const calls = yield* Ref.make(0)
          const rejections = CircuitBreaker.callsMetric.pipe(
            Metric.withAttributes({ "circuit_breaker.name": breaker.key, "circuit_breaker.outcome": "rejected" })
          )
          const worker = yield* breaker.execute(Ref.update(calls, (n) => n + 1), { onRejected: "wait" }).pipe(
            Effect.forkScoped
          )
          yield* TestClock.adjust("999 millis")
          assert.strictEqual(yield* Ref.get(calls), 0)
          assert.strictEqual((yield* Metric.value(rejections)).count, 0)
          yield* Effect.flip(breaker.execute(Effect.void))
          assert.strictEqual((yield* Metric.value(rejections)).count, 1)
          yield* TestClock.adjust("101 millis")
          yield* Fiber.join(worker)
          assert.strictEqual(yield* Ref.get(calls), 1)
          assert.strictEqual((yield* Metric.value(rejections)).count, 1)
        }))

      it.effect("keeps idle workers outside the breaker until jobs arrive", () =>
        Effect.gen(function*() {
          const breaker = yield* make("idle-workers", { policy: CircuitBreaker.consecutiveFailures(1) })
          const queue = yield* Queue.make<number>()
          const calls = yield* Ref.make(0)
          const probe = yield* Deferred.make<void>()
          const process = Effect.fnUntraced(function*(_job: number) {
            const call = yield* Ref.updateAndGet(calls, (n) => n + 1)
            if (call === 1) yield* Deferred.await(probe)
          })
          const workers = yield* Effect.forEach(
            [1, 2, 3],
            () =>
              Queue.take(queue).pipe(
                Effect.flatMap((job) => breaker.execute(process(job), { onRejected: "wait" })),
                Effect.forkScoped
              )
          )
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          yield* Effect.flip(breaker.execute(Effect.fail("open")))
          yield* Queue.offerAll(queue, [1, 2, 3])
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          assert.strictEqual(yield* Ref.get(calls), 0)
          yield* TestClock.adjust("999 millis")
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          assert.strictEqual(yield* Ref.get(calls), 0)
          yield* TestClock.adjust("1 milli")
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          assert.strictEqual(yield* Ref.get(calls), 1)
          assert.strictEqual((yield* breaker.state)._tag, "HalfOpen")
          // stays below the probe lease, so only the polling of the waiting workers is exercised
          yield* TestClock.adjust("900 millis")
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          assert.strictEqual(yield* Ref.get(calls), 1)
          yield* Deferred.succeed(probe, undefined)
          yield* TestClock.withLive(Effect.sleep("100 millis"))
          assert.strictEqual(yield* Ref.get(calls), 3)
          yield* Effect.forEach(workers, Fiber.join)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }).pipe(Effect.provideService(Random.Random, { nextDoubleUnsafe: () => 0, nextIntUnsafe: () => 0 })))

      for (const failedProbe of [false, true]) {
        it.effect(`shares waiting workers across breakers with a ${failedProbe ? "failed" : "successful"} probe`, () =>
          Effect.gen(function*() {
            const first = yield* make("wait-workers", { policy: CircuitBreaker.consecutiveFailures(1) })
            const second = yield* CircuitBreaker.make({
              key: first.key,
              policy: CircuitBreaker.consecutiveFailures(1),
              openFor: "1 second"
            })
            yield* Effect.flip(first.execute(Effect.fail("open")))
            const calls = yield* Ref.make(0)
            const probe = yield* Deferred.make<void, string>()
            const remaining = yield* Deferred.make<void>()
            const queue = yield* Queue.make<number>()
            yield* Queue.offerAll(queue, Array.from({ length: 10 }, (_, i) => i))
            const process = Effect.fnUntraced(function*(_job: number) {
              const job = yield* Ref.updateAndGet(calls, (n) => n + 1)
              if (job === 1) return yield* Deferred.await(probe)
              return yield* Deferred.await(remaining)
            })
            const workers = yield* Effect.forEach(
              Array.from({ length: 10 }, (_, i) => i),
              (i) =>
                Queue.take(queue).pipe(
                  Effect.flatMap((job) => (i % 2 === 0 ? first : second).execute(process(job), { onRejected: "wait" })),
                  Effect.exit,
                  Effect.forkScoped
                )
            )
            yield* TestClock.withLive(Effect.sleep("100 millis"))
            yield* TestClock.adjust("1100 millis")
            yield* TestClock.withLive(Effect.sleep("100 millis"))
            assert.strictEqual(yield* Ref.get(calls), 1)
            if (failedProbe) {
              yield* Deferred.fail(probe, "probe failed")
              yield* TestClock.withLive(Effect.sleep("100 millis"))
              yield* TestClock.adjust("500 millis")
              yield* TestClock.withLive(Effect.sleep("100 millis"))
              assert.strictEqual((yield* first.state)._tag, "Open")
              assert.strictEqual(yield* Ref.get(calls), 1)
              yield* TestClock.adjust("1600 millis")
              yield* TestClock.withLive(Effect.sleep("100 millis"))
              assert.strictEqual(yield* Ref.get(calls), 2)
            } else {
              yield* Deferred.succeed(probe, undefined)
              yield* TestClock.withLive(Effect.sleep("100 millis"))
              yield* TestClock.adjust("1 second")
              yield* TestClock.withLive(Effect.sleep("100 millis"))
              assert.strictEqual(yield* Ref.get(calls), 10)
            }
            yield* Deferred.succeed(remaining, undefined)
            yield* TestClock.withLive(Effect.sleep("100 millis"))
            yield* TestClock.adjust("1 second")
            yield* TestClock.withLive(Effect.sleep("100 millis"))
            yield* Effect.forEach(workers, Fiber.join)
            assert.strictEqual(yield* Ref.get(calls), 10)
            assert.strictEqual((yield* second.state)._tag, "Closed")
          }))
      }

      it.effect("wakes local half-open waiters immediately on close", () =>
        Effect.gen(function*() {
          const breaker = yield* make("wait-local", { policy: CircuitBreaker.consecutiveFailures(1) })
          yield* Effect.flip(breaker.execute(Effect.fail("open")))
          yield* TestClock.adjust("1 second")
          const started = yield* Deferred.make<void>()
          const release = yield* Deferred.make<void>()
          const probe = yield* breaker.execute(
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Deferred.await(release))
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(started)
          const worker = yield* breaker.execute(Effect.succeed("resumed"), { onRejected: "wait" }).pipe(
            Effect.forkScoped({ startImmediately: true })
          )
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.join(probe)
          assert.strictEqual(yield* Fiber.join(worker), "resumed")
        }))

      it.effect("interrupts waiting workers without holding a probe permit", () =>
        Effect.gen(function*() {
          const breaker = yield* make("interrupt-wait", { policy: CircuitBreaker.consecutiveFailures(1) })
          yield* Effect.flip(breaker.execute(Effect.fail("open")))
          const waiting = yield* breaker.execute(Effect.die("must not run"), { onRejected: "wait" }).pipe(
            Effect.forkScoped
          )
          yield* TestClock.adjust("100 millis")
          yield* Fiber.interrupt(waiting)
          yield* TestClock.adjust("1 second")
          const started = yield* Deferred.make<void>()
          const probe = yield* breaker.execute(
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never)
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(started)
          const halfOpenWaiter = yield* breaker.execute(Effect.die("must not run"), { onRejected: "wait" }).pipe(
            Effect.forkScoped
          )
          yield* TestClock.adjust("100 millis")
          yield* Fiber.interrupt(halfOpenWaiter)
          yield* Fiber.interrupt(probe)
          const state = yield* breaker.state
          assert.strictEqual(state._tag, "HalfOpen")
          if (state._tag === "HalfOpen") assert.strictEqual(state.inFlight, 0)
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))
    })

    describe("half-open", () => {
      it.effect("lazily enters HalfOpen and limits concurrent probes", () =>
        Effect.gen(function*() {
          const breaker = yield* make("permits", { halfOpen: { permits: 2, successes: 3 } })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("1 second")
          assert.strictEqual((yield* breaker.state)._tag, "Open")
          const release = yield* Deferred.make<void>()
          const firstStarted = yield* Deferred.make<void>()
          const secondStarted = yield* Deferred.make<void>()
          const first = yield* breaker.execute(
            Deferred.succeed(firstStarted, undefined).pipe(
              Effect.andThen(Deferred.await(release))
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(firstStarted)
          const second = yield* breaker.execute(
            Deferred.succeed(secondStarted, undefined).pipe(
              Effect.andThen(Deferred.await(release))
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(secondStarted)
          const state = yield* breaker.state
          assert.strictEqual(state._tag, "HalfOpen")
          if (state._tag === "HalfOpen") assert.strictEqual(state.inFlight, 2)
          const calls = yield* Ref.make(0)
          const reason = open(yield* Effect.flip(breaker.execute(Ref.update(calls, (n) => n + 1))))
          assert.strictEqual(reason.state, "HalfOpen")
          assert.isUndefined(reason.retryAfter)
          assert.strictEqual(yield* Ref.get(calls), 0)
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.join(first)
          yield* Fiber.join(second)
        }))

      it.effect("closes only after the configured number of successful probes", () =>
        Effect.gen(function*() {
          const breaker = yield* make("successes", { halfOpen: { successes: 2 } })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          const state = yield* breaker.state
          assert.strictEqual(state._tag, "HalfOpen")
          if (state._tag === "HalfOpen") assert.strictEqual(state.successes, 1)
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))

      it.effect("reopens on a failed probe with the next Schedule delay", () =>
        Effect.gen(function*() {
          const breaker = yield* make("backoff", {
            policy: CircuitBreaker.consecutiveFailures(1),
            openFor: Schedule.exponential("1 second")
          })
          yield* Effect.flip(breaker.execute(Effect.fail("initial")))
          const first = open(yield* Effect.flip(breaker.execute(Effect.void)))
          assert.deepStrictEqual(first.retryAfter, Duration.seconds(1))
          yield* TestClock.adjust("1 second")
          assert.strictEqual(yield* Effect.flip(breaker.execute(Effect.fail("probe"))), "probe")
          const second = open(yield* Effect.flip(breaker.execute(Effect.void)))
          assert.deepStrictEqual(second.retryAfter, Duration.seconds(2))
          yield* TestClock.adjust("2 seconds")
          yield* breaker.execute(Effect.void)
          yield* Effect.flip(breaker.execute(Effect.fail("after recovery")))
          assert.deepStrictEqual(open(yield* Effect.flip(breaker.execute(Effect.void))).retryAfter, Duration.seconds(1))
        }))
    })

    describe("interrupts and classification", () => {
      it.effect("does not count interrupted closed calls as failures", () =>
        Effect.gen(function*() {
          const breaker = yield* make("interrupt-closed", {
            classify: (exit) => Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause) ? "success" : "failure"
          })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          const started = yield* Deferred.make<void>()
          const fiber = yield* breaker.execute(
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never)
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(started)
          yield* Fiber.interrupt(fiber)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
        }))

      it.effect("interrupting a probe releases its slot without advancing recovery", () =>
        Effect.gen(function*() {
          const breaker = yield* make("interrupt-probe", { halfOpen: { permits: 1, successes: 2 } })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("1 second")
          const started = yield* Deferred.make<void>()
          const fiber = yield* breaker.execute(
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never)
            )
          ).pipe(Effect.forkScoped)
          yield* Deferred.await(started)
          yield* Fiber.interrupt(fiber)
          const state = yield* breaker.state
          assert.strictEqual(state._tag, "HalfOpen")
          if (state._tag === "HalfOpen") {
            assert.strictEqual(state.inFlight, 0)
            assert.strictEqual(state.successes, 0)
          }
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "HalfOpen")
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))

      it.effect("ignored typed errors neither trip nor reset consecutive failures", () =>
        Effect.gen(function*() {
          const breaker = yield* make("classification", {
            classify: (exit) => {
              if (Exit.isSuccess(exit)) return "success"
              return Cause.squash(exit.cause) === "excluded" ? "ignored" : "failure"
            }
          })
          assert.strictEqual(yield* Effect.flip(breaker.execute(Effect.fail("excluded"))), "excluded")
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* Effect.flip(breaker.execute(Effect.fail("failure")))
          assert.strictEqual(yield* Effect.flip(breaker.execute(Effect.fail("excluded"))), "excluded")
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* Effect.flip(breaker.execute(Effect.fail("failure")))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
        }))

      it.effect("counts defects alongside excluded typed errors as failures", () =>
        Effect.gen(function*() {
          const breaker = yield* make("mixed-cause", {
            policy: CircuitBreaker.consecutiveFailures(1),
            classify: (exit) => Exit.isFailure(exit) && Cause.hasDies(exit.cause) ? "failure" : "ignored"
          })
          const cause = Cause.combine(Cause.fail("excluded"), Cause.die("defect"))
          assert.deepStrictEqual(yield* Effect.exit(breaker.execute(Effect.failCause(cause))), Exit.failCause(cause))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
        }))

      it.effect("records failed probes when classify throws and preserves the original error", () =>
        Effect.gen(function*() {
          const breaker = yield* make("throwing-classifier", {
            classify: (exit) => {
              if (Exit.isSuccess(exit)) return "success"
              throw new Error("classifier")
            }
          })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("1 second")
          assert.deepStrictEqual(yield* Effect.exit(breaker.execute(Effect.fail("original"))), Exit.fail("original"))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))
    })

    describe("generations", () => {
      it.effect("ignores a stale failure after opening and recovering", () =>
        Effect.gen(function*() {
          const breaker = yield* make("stale", { policy: CircuitBreaker.consecutiveFailures(1) })
          const started = yield* Deferred.make<void>()
          const release = yield* Deferred.make<void>()
          const slow = yield* breaker.execute(
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Deferred.await(release)),
              Effect.andThen(Effect.fail("slow"))
            )
          ).pipe(Effect.exit, Effect.forkScoped)
          yield* Deferred.await(started)
          yield* Effect.flip(breaker.execute(Effect.fail("fast")))
          assert.strictEqual((yield* breaker.state)._tag, "Open")
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          const recovered = yield* breaker.state
          assert.strictEqual(recovered._tag, "Closed")
          yield* Deferred.succeed(release, undefined)
          assert.isTrue(Exit.isFailure(yield* Fiber.join(slow)))
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          yield* breaker.execute(Effect.void)
        }))

      it.effect("retains recovered generations beyond a short failure-rate window", () =>
        Effect.gen(function*() {
          const policy = CircuitBreaker.failureRate({ threshold: 1, minimumCalls: 1, window: "1 millis" })
          const breaker = yield* make("generation-window", { policy })
          const store = yield* CircuitBreaker.CircuitBreakerStore
          const acquired = yield* store.acquire({ key: breaker.key, halfOpenPermits: 1 })
          if (acquired._tag !== "Permitted") return assert.fail("Expected permit")
          yield* Effect.flip(breaker.execute(Effect.fail("failure")))
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          // Redis expiration uses wall time rather than TestClock.
          yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))
          yield* TestClock.adjust("1 second")
          yield* store.record({
            key: breaker.key,
            permit: acquired.permit,
            outcome: "failure",
            policy,
            halfOpenSuccesses: 1,
            openForMillis: 1_000
          })
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))
    })

    describe("openFor schedule", () => {
      it.effect("records probes with the last duration when a schedule step dies", () =>
        Effect.gen(function*() {
          const breaker = yield* make("dying-schedule", {
            openFor: Schedule.exponential("1 second").pipe(
              Schedule.modifyDelay(({ input, duration }) =>
                input === 0 ? Effect.succeed(duration) : Effect.die("schedule")
              )
            )
          })
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          yield* TestClock.adjust("1 second")
          assert.deepStrictEqual(yield* Effect.exit(breaker.execute(Effect.fail("original"))), Exit.fail("original"))
          assert.deepStrictEqual(open(yield* Effect.flip(breaker.execute(Effect.void))).retryAfter, Duration.seconds(1))
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
        }))

      it.effect("uses zero when the first schedule step dies", () =>
        Effect.gen(function*() {
          const breaker = yield* make("dying-first-step", {
            policy: CircuitBreaker.consecutiveFailures(1),
            openFor: Schedule.spaced("1 second").pipe(Schedule.modifyDelay(() => Effect.die("schedule")))
          })
          assert.deepStrictEqual(yield* Effect.exit(breaker.execute(Effect.fail("original"))), Exit.fail("original"))
          const state = yield* breaker.state
          assert.strictEqual(state._tag, "Open")
          if (state._tag === "Open") assert.strictEqual(state.retryAt, yield* Clock.currentTimeMillis)
        }))
    })

    describe("state and integration", () => {
      it.effect("publishes observed transitions and reflects them in state", () =>
        Effect.gen(function*() {
          const breaker = yield* make("transitions", { halfOpen: { successes: 2 } })
          const transitions = yield* breaker.transitions.pipe(
            Stream.take(3),
            Stream.runCollect,
            Effect.forkScoped({ startImmediately: true })
          )
          const at = yield* Clock.currentTimeMillis
          yield* Effect.flip(breaker.execute(Effect.fail("first")))
          yield* Effect.flip(breaker.execute(Effect.fail("second")))
          const opened = yield* breaker.state
          assert.strictEqual(opened._tag, "Open")
          if (opened._tag !== "Open") return assert.fail("Expected Open")
          assert.strictEqual(opened.trips, 1)
          assert.strictEqual(opened.retryAt, at + 1_000)
          yield* TestClock.adjust("1 second")
          yield* breaker.execute(Effect.void)
          assert.deepStrictEqual(yield* breaker.state, {
            _tag: "HalfOpen",
            generation: opened.generation + 1,
            trips: 1,
            inFlight: 0,
            successes: 1
          })
          yield* breaker.execute(Effect.void)
          assert.strictEqual((yield* breaker.state)._tag, "Closed")
          assert.deepStrictEqual(yield* Fiber.join(transitions), [
            { key: breaker.key, from: "Closed", to: "Open", generation: opened.generation, at },
            { key: breaker.key, from: "Open", to: "HalfOpen", generation: opened.generation + 1, at: at + 1_000 },
            { key: breaker.key, from: "HalfOpen", to: "Closed", generation: opened.generation + 2, at: at + 1_000 }
          ])
        }))

      it.effect("shares state between make calls with the same key", () =>
        Effect.gen(function*() {
          const options = {
            key: key("shared"),
            policy: CircuitBreaker.consecutiveFailures(2),
            openFor: "1 second"
          } as const
          const first = yield* CircuitBreaker.make(options)
          const second = yield* CircuitBreaker.make(options)
          yield* Effect.flip(first.execute(Effect.fail("first")))
          yield* Effect.flip(second.execute(Effect.fail("second")))
          assert.strictEqual(open(yield* Effect.flip(first.execute(Effect.void))).state, "Open")
          assert.deepStrictEqual(yield* first.state, yield* second.state)
          yield* TestClock.adjust("1 second")
          yield* second.execute(Effect.void)
          assert.strictEqual((yield* first.state)._tag, "Closed")
        }))

      it.effect("counts each retry attempt and stops retrying at the open error", () =>
        Effect.gen(function*() {
          const breaker = yield* make("retry", { policy: CircuitBreaker.consecutiveFailures(3) })
          const calls = yield* Ref.make(0)
          const error = yield* breaker.execute(
            Ref.update(calls, (n) => n + 1).pipe(
              Effect.andThen(Effect.fail("failure"))
            )
          ).pipe(
            Effect.retry({ times: 5, while: (error) => !CircuitBreaker.isCircuitBreakerError(error) }),
            Effect.flip
          )
          assert.strictEqual(open(error).state, "Open")
          assert.strictEqual(yield* Ref.get(calls), 3)
        }))
    })
  })
}
