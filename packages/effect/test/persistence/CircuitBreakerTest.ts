import { assert, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Exit, Fiber, type Layer, Schedule, Stream } from "effect"
import { CircuitBreaker } from "effect/persistence"

/**
 * Moves the store's notion of "now" forward. Memory stores pass
 * `TestClock.adjust`, stores that read wall time pass a live sleep.
 */
export type Advance = (duration: Duration.Input) => Effect.Effect<void>

const rejection = Effect.fnUntraced(function*<A, E, R>(
  effect: Effect.Effect<A, E | CircuitBreaker.CircuitBreakerError, R>
) {
  const error = yield* Effect.flip(effect)
  return error instanceof CircuitBreaker.CircuitBreakerError
    ? error.reason
    : assert.fail("Expected CircuitBreakerError")
})

/**
 * Starts a call that is admitted and then waits for `gate` before
 * completing with `result`.
 */
const held = Effect.fnUntraced(function*<E>(
  breaker: CircuitBreaker.CircuitBreaker,
  key: string,
  result: Effect.Effect<void, E>,
  options?: { readonly classify?: CircuitBreaker.ExecuteOptions<void, E>["classify"] }
) {
  const started = yield* Deferred.make<void>()
  const gate = yield* Deferred.make<void>()
  const fiber = yield* Deferred.succeed(started, undefined).pipe(
    Effect.andThen(Deferred.await(gate)),
    Effect.andThen(result),
    breaker.execute({ key, classify: options?.classify }),
    Effect.forkChild
  )
  yield* Deferred.await(started)
  return {
    fiber,
    release: Deferred.succeed(gate, undefined).pipe(Effect.andThen(Fiber.await(fiber)))
  } as const
})

const fail = (breaker: CircuitBreaker.CircuitBreaker, key: string) =>
  Effect.fail("boom").pipe(breaker.execute({ key }), Effect.ignore)

export const suite = (
  name: string,
  layer: Layer.Layer<CircuitBreaker.CircuitBreakerStore, unknown>,
  advance: Advance
) => {
  it.layer(layer, { timeout: "30 seconds" })(`CircuitBreaker (${name})`, (it) => {
    it.effect("consecutive: only a Success resets the streak and the n-th failure opens", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "consecutive"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(3),
          openDuration: "1 minute"
        })
        yield* fail(breaker, key)
        yield* fail(breaker, key)
        yield* Effect.void.pipe(breaker.execute({ key }))
        yield* fail(breaker, key)
        yield* fail(breaker, key)
        yield* Effect.fail("boom").pipe(
          breaker.execute({ key, classify: () => CircuitBreaker.ignored }),
          Effect.ignore
        )
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")

        yield* fail(breaker, key)
        let ran = false
        const reason = yield* rejection(
          Effect.sync(() => {
            ran = true
          }).pipe(breaker.execute({ key }))
        )

        assert.isFalse(ran)
        if (reason._tag !== "CircuitOpen") {
          return assert.fail("Expected CircuitOpen")
        }
        assert.strictEqual(reason.key, key)
        const remaining = Duration.toMillis(reason.retryAfter)
        assert.isTrue(remaining > 0 && remaining <= 60_000)
        const state = yield* breaker.state(key)
        assert.strictEqual(state._tag, "Open")
        assert.strictEqual(state._tag === "Open" && state.consecutiveOpenings, 1)
      })))

    it.effect("rate: opens at the threshold once minimumCalls are recorded, ignoring Ignored", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "rate"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.rate({ threshold: 0.5, size: 4, minimumCalls: 4 }),
          openDuration: "1 minute"
        })
        const ignoredFailure = Effect.fail("boom").pipe(
          breaker.execute({ key, classify: () => CircuitBreaker.ignored }),
          Effect.ignore
        )
        yield* Effect.void.pipe(breaker.execute({ key }))
        yield* ignoredFailure
        yield* fail(breaker, key)
        yield* ignoredFailure
        yield* Effect.void.pipe(breaker.execute({ key }))
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")

        yield* fail(breaker, key)
        assert.strictEqual((yield* breaker.state(key))._tag, "Open")
      })))

    it.effect("half-open admits one probe, rejects the rest, and a success closes", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "half-open"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "200 millis"
        })
        const transitions = yield* breaker.transitions.pipe(
          Stream.take(3),
          Stream.runCollect,
          Effect.forkChild({ startImmediately: true })
        )
        yield* fail(breaker, key)
        yield* advance("300 millis")
        const lazy = yield* breaker.state(key)
        assert.strictEqual(lazy._tag, "Open")
        assert.deepStrictEqual(lazy._tag === "Open" && lazy.retryAfter, Duration.zero)

        const probe = yield* held(breaker, key, Effect.void)
        assert.strictEqual((yield* rejection(Effect.void.pipe(breaker.execute({ key }))))._tag, "CircuitHalfOpen")
        assert.deepStrictEqual(yield* breaker.state(key), {
          _tag: "HalfOpen",
          key,
          probing: true,
          consecutiveOpenings: 1
        })

        assert.isTrue(Exit.isSuccess(yield* probe.release))
        assert.deepStrictEqual(yield* breaker.state(key), { _tag: "Closed", key })
        const [opened, ...rest] = yield* Fiber.join(transitions)
        assert.strictEqual(opened.from, "Closed")
        assert.strictEqual(opened.to, "Open")
        assert.strictEqual(opened.to === "Open" && opened.consecutiveOpenings, 1)
        assert.deepStrictEqual(rest, [
          { key, from: "Open", to: "HalfOpen" },
          { key, from: "HalfOpen", to: "Closed" }
        ])
      })))

    it.effect("a Schedule openDuration replays across openings and resets on close", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "schedule"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(2),
          openDuration: Schedule.exponential("200 millis")
        })
        yield* fail(breaker, key)
        yield* fail(breaker, key)
        yield* advance("300 millis")
        // A failed probe reopens without consulting the trip policy.
        yield* fail(breaker, key)
        const reopened = yield* breaker.state(key)
        assert.strictEqual(reopened._tag === "Open" && reopened.consecutiveOpenings, 2)

        yield* advance("300 millis")
        assert.strictEqual((yield* rejection(Effect.void.pipe(breaker.execute({ key }))))._tag, "CircuitOpen")
        yield* advance("200 millis")
        yield* Effect.void.pipe(breaker.execute({ key }))
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")

        yield* fail(breaker, key)
        yield* fail(breaker, key)
        const fresh = yield* breaker.state(key)
        assert.strictEqual(fresh._tag === "Open" && fresh.consecutiveOpenings, 1)
        yield* advance("300 millis")
        yield* Effect.void.pipe(breaker.execute({ key }))
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")
      })))

    it.effect("a Retry-After hint extends only the opening it causes, capped at maxOpenDuration", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "hint"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "200 millis",
          maxOpenDuration: "600 millis"
        })
        const hinted = Effect.fail("boom").pipe(
          breaker.execute({ key, classify: () => CircuitBreaker.failure({ retryAfter: "1 hour" }) }),
          Effect.ignore
        )
        yield* hinted
        yield* advance("300 millis")
        assert.strictEqual((yield* rejection(Effect.void.pipe(breaker.execute({ key }))))._tag, "CircuitOpen")
        yield* advance("400 millis")

        // The probe fails without a hint, so the next opening uses openDuration.
        yield* fail(breaker, key)
        yield* advance("300 millis")
        yield* Effect.void.pipe(breaker.execute({ key }))
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")
      })))

    it.effect("an interrupt-only exit records Ignored and an interrupted probe frees its slot", () =>
      Effect.scoped(Effect.gen(function*() {
        const key = "interrupt"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "200 millis"
        })
        const classify = () => CircuitBreaker.failure()
        const closedCall = yield* held(breaker, key, Effect.void, { classify })
        yield* Fiber.interrupt(closedCall.fiber)
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")

        yield* fail(breaker, key)
        yield* advance("300 millis")
        const probe = yield* held(breaker, key, Effect.void, { classify })
        yield* Fiber.interrupt(probe.fiber)
        assert.deepStrictEqual(yield* breaker.state(key), {
          _tag: "HalfOpen",
          key,
          probing: false,
          consecutiveOpenings: 1
        })

        yield* Effect.void.pipe(breaker.execute({ key }))
        assert.strictEqual((yield* breaker.state(key))._tag, "Closed")
      })))

    it.effect("a stale outcome changes nothing, while another key's current permit still counts", () =>
      Effect.scoped(Effect.gen(function*() {
        const a = "stale-a"
        const b = "stale-b"
        const breaker = yield* CircuitBreaker.make({
          tripPolicy: CircuitBreaker.consecutive(1),
          openDuration: "200 millis"
        })
        const staleA = yield* held(breaker, a, Effect.void)
        const currentB = yield* held(breaker, b, Effect.fail("boom"))

        yield* fail(breaker, a)
        yield* advance("300 millis")
        const probe = yield* held(breaker, a, Effect.fail("boom"))

        assert.isTrue(Exit.isSuccess(yield* staleA.release))
        assert.isTrue(Exit.isFailure(yield* currentB.release))
        const halfOpen = yield* breaker.state(a)
        assert.strictEqual(halfOpen._tag === "HalfOpen" && halfOpen.probing, true)
        assert.strictEqual((yield* breaker.state(b))._tag, "Open")

        yield* probe.release
        const reopened = yield* breaker.state(a)
        assert.strictEqual(reopened._tag === "Open" && reopened.consecutiveOpenings, 2)
      })))
  })
}
