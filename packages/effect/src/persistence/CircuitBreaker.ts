/**
 * Guards calls to unreliable dependencies with keyed circuit breakers.
 *
 * A `CircuitBreaker` holds one circuit per key. Each circuit is Closed, Open,
 * or HalfOpen, and its state lives in a `CircuitBreakerStore` so that several
 * fibers or processes can share it. Calls made through an Open or probing
 * HalfOpen circuit are rejected with a typed `CircuitBreakerError` instead of
 * running.
 *
 * @stability experimental
 * @since 4.0.6
 */
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import { dual } from "../Function.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as Take from "../Take.ts"

/**
 * Runtime type identifier for `CircuitBreaker` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.6
 */
export const TypeId: TypeId = "~effect/persistence/CircuitBreaker"

/**
 * Type-level identifier used to brand `CircuitBreaker` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.6
 */
export type TypeId = "~effect/persistence/CircuitBreaker"

/**
 * Service that runs effects through keyed circuits and reports their state.
 *
 * **Details**
 *
 * - `execute` admits the call through the circuit for `key`, runs it,
 *   classifies its exit, and records the outcome. `classify` sees the full
 *   exit of the call and returns an `Outcome`, either directly or as an
 *   effect. Without it, every success is a `Success` and every failure,
 *   defects included, is a `Failure`. An exit that is only interruption is
 *   recorded as `Ignored` before `classify` runs.
 * - `state` reads the shared state of a circuit, with relative times only.
 * - `transitions` emits the transitions made by this breaker instance only,
 *   and ends when the breaker's scope closes.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface CircuitBreaker {
  readonly [TypeId]: TypeId

  readonly execute: {
    <A, E, R2 = never>(options: {
      readonly key: string
      readonly classify?: ((exit: Exit.Exit<A, E>) => Outcome | Effect.Effect<Outcome, never, R2>) | undefined
    }): <R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | CircuitBreakerError, R | R2>
    <A, E, R, R2 = never>(
      self: Effect.Effect<A, E, R>,
      options: {
        readonly key: string
        readonly classify?: ((exit: Exit.Exit<A, E>) => Outcome | Effect.Effect<Outcome, never, R2>) | undefined
      }
    ): Effect.Effect<A, E | CircuitBreakerError, R | R2>
  }

  readonly state: (key: string) => Effect.Effect<State, CircuitBreakerError>

  readonly transitions: Stream.Stream<Transition>
}

/**
 * Service tag for the default `CircuitBreaker`.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export const CircuitBreaker: Context.Service<CircuitBreaker, CircuitBreaker> = Context.Service<CircuitBreaker>(
  TypeId
)

/**
 * Creates a `CircuitBreaker` from the current `CircuitBreakerStore`.
 *
 * **Details**
 *
 * - `tripPolicy` decides when a Closed circuit opens.
 * - `openDuration` is a fixed duration, or a schedule whose output is
 *   ignored. The schedule is never stored. For each opening the breaker takes
 *   a fresh step from the schedule and replays it `consecutiveOpenings` times
 *   against a simulated clock. The clock starts at the current time when the
 *   opening is recorded and advances by each replayed delay, so step k sees
 *   `attempt = k` and `elapsed` equal to the sum of the earlier replayed
 *   delays. Wall time spent idle, waiting for the probe, or inside the probe
 *   never enters the replay.
 * - Delay-, attempt- and elapsed-time-based schedules (`exponential`,
 *   `fibonacci`, `spaced`, `fixed`, `recurs`, `upTo`, `during`, `jittered`)
 *   are supported as `openDuration`; `jittered` draws fresh randomness on
 *   every replay. Schedules that read the absolute timestamp, such as `cron`,
 *   are not supported. When the schedule ends, the last delay it produced
 *   repeats; a schedule that ends before producing any delay opens the
 *   circuit for zero time.
 * - `maxOpenDuration` caps a `Retry-After` hint from `failure`, and defaults
 *   to one hour. It never caps `openDuration`.
 * - `onStoreError` decides what a call does when the store cannot admit it:
 *   `"allow"` (the default) runs it unrecorded and logs a warning, `"fail"`
 *   fails it with `CircuitBreakerStoreError`.
 *
 * The breaker's `transitions` stream ends when the surrounding scope closes.
 *
 * **Example** (Capping backoff growth by time spent open)
 *
 * `upTo({ duration })` measures the sum of the earlier open windows, not wall
 * time. Here the delay keeps doubling while the previous open windows add up
 * to at most one minute, then the last delay repeats.
 *
 * ```ts import.meta.vitest
 * import { Effect, Schedule } from "effect"
 * import { CircuitBreaker } from "effect/persistence"
 *
 * // Openings last 1, 2, 4, 8, 16 and 32 seconds. The seventh replay sees 63
 * // seconds of earlier open time, so the schedule ends and every later
 * // opening lasts 32 seconds, until a successful probe closes the circuit.
 * const program = Effect.gen(function*() {
 *   const breaker = yield* CircuitBreaker.make({
 *     tripPolicy: CircuitBreaker.consecutive(5),
 *     openDuration: Schedule.exponential("1 second").pipe(
 *       Schedule.upTo({ duration: "1 minute" })
 *     )
 *   })
 *   return yield* Effect.succeed("ok").pipe(breaker.execute({ key: "payments" }))
 * }).pipe(Effect.scoped, Effect.provide(CircuitBreaker.layerStoreMemory()))
 *
 * await Effect.runPromise(program) // => "ok"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const make: (options: {
  readonly tripPolicy: TripPolicy
  readonly openDuration: Duration.Input | Schedule.Schedule<unknown, number, never, never>
  readonly maxOpenDuration?: Duration.Input | undefined
  readonly onStoreError?: "allow" | "fail" | undefined
}) => Effect.Effect<CircuitBreaker, never, CircuitBreakerStore | Scope.Scope> = Effect.fnUntraced(
  function*(options: Parameters<typeof make>[0]) {
    const store = yield* CircuitBreakerStore
    const scope = yield* Effect.scope
    const pubsub = yield* PubSub.sliding<Take.Take<Transition>>(128)
    yield* Scope.addFinalizer(scope, PubSub.end(pubsub, Exit.void))

    const maxOpenDuration = Duration.fromInputUnsafe(options.maxOpenDuration ?? "1 hour")
    const onStoreError = options.onStoreError ?? "allow"
    const openDurationFor = makeOpenDuration(options.openDuration)

    const publish = (transition: Transition | undefined) =>
      transition === undefined ? Effect.void : PubSub.publish(pubsub, [transition])

    // A rate policy can trip on a Success, so every recorded outcome needs the
    // base open duration. Only a Failure carries a hint.
    const openFor = (outcome: Outcome, consecutiveOpenings: number) =>
      Effect.map(
        openDurationFor(consecutiveOpenings),
        (delay) =>
          outcome._tag === "Failure" && outcome.retryAfter !== undefined
            ? Duration.max(delay, Duration.min(outcome.retryAfter, maxOpenDuration))
            : delay
      )

    const execute = <A, E, R, R2>(
      self: Effect.Effect<A, E, R>,
      { classify, key }: {
        readonly key: string
        readonly classify?: ((exit: Exit.Exit<A, E>) => Outcome | Effect.Effect<Outcome, never, R2>) | undefined
      }
    ): Effect.Effect<A, E | CircuitBreakerError, R | R2> =>
      Effect.uninterruptibleMask((restore) =>
        Effect.flatMap(Scope.make(), (admitScope) =>
          store.admit(key).pipe(
            Scope.provide(admitScope),
            Effect.matchCauseEffect({
              onFailure: (cause): Effect.Effect<A, E | CircuitBreakerError, R> => {
                const error = Cause.findErrorOption(cause)
                if (
                  onStoreError === "fail" || error._tag === "None" ||
                  error.value.reason._tag !== "CircuitBreakerStoreError"
                ) {
                  return Effect.failCause(cause)
                }
                return Effect.andThen(
                  Effect.logWarning("CircuitBreaker store unavailable, running the call unrecorded", error.value),
                  restore(self)
                )
              },
              onSuccess: Effect.fnUntraced(function*(admission) {
                yield* publish(admission.transition)
                const exit = yield* Effect.exit(restore(self))
                const classified = yield* classifyExit(exit, classify, restore)
                const outcome = Exit.isSuccess(classified) ? classified.value : ignored
                yield* store.record({
                  key,
                  generation: admission.generation,
                  outcome: outcome._tag,
                  tripPolicy: options.tripPolicy,
                  openFor: outcome._tag === "Ignored"
                    ? Duration.zero
                    : yield* openFor(outcome, admission.consecutiveOpenings + 1)
                }).pipe(
                  Effect.flatMap(publish),
                  Effect.catch((error) => Effect.logWarning("CircuitBreaker failed to record an outcome", error))
                )
                if (Exit.isSuccess(classified)) return yield* exit
                return yield* Effect.failCause(
                  Exit.isFailure(exit) ? Cause.combine(exit.cause, classified.cause) : classified.cause
                )
              })
            }),
            Effect.onExit((exit) => Scope.close(admitScope, exit))
          ))
      )

    return CircuitBreaker.of({
      [TypeId]: TypeId,
      execute: dual(2, execute),
      state: store.state,
      transitions: Stream.fromPubSubTake(pubsub)
    })
  }
)

/**
 * Provides `CircuitBreaker` using the current `CircuitBreakerStore`.
 *
 * **Details**
 *
 * Takes the same options as `make`.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.6
 */
export const layer = (options: {
  readonly tripPolicy: TripPolicy
  readonly openDuration: Duration.Input | Schedule.Schedule<unknown, number, never, never>
  readonly maxOpenDuration?: Duration.Input | undefined
  readonly onStoreError?: "allow" | "fail" | undefined
}): Layer.Layer<CircuitBreaker, never, CircuitBreakerStore> => Layer.effect(CircuitBreaker, make(options))

const classifyExit = <A, E, R2>(
  exit: Exit.Exit<A, E>,
  classify: ((exit: Exit.Exit<A, E>) => Outcome | Effect.Effect<Outcome, never, R2>) | undefined,
  restore: <AX, EX, RX>(effect: Effect.Effect<AX, EX, RX>) => Effect.Effect<AX, EX, RX>
): Effect.Effect<Exit.Exit<Outcome>, never, R2> => {
  if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) {
    return Effect.succeed(Exit.succeed(ignored))
  }
  if (classify === undefined) {
    return Effect.succeed(Exit.succeed(Exit.isSuccess(exit) ? success : failure()))
  }
  return Effect.exit(restore(Effect.suspend(() => {
    const outcome = classify(exit)
    return Effect.isEffect(outcome) ? outcome : Effect.succeed(outcome)
  })))
}

const makeOpenDuration = (
  openDuration: Duration.Input | Schedule.Schedule<unknown, number, never, never>
): (consecutiveOpenings: number) => Effect.Effect<Duration.Duration> => {
  if (!Schedule.isSchedule(openDuration)) {
    const duration = Effect.succeed(Duration.fromInputUnsafe(openDuration))
    return () => duration
  }
  // Replays the schedule against a simulated clock, so `upTo` and `during`
  // measure the time spent open rather than wall time.
  return (consecutiveOpenings) =>
    Effect.gen(function*() {
      const step = yield* Schedule.toStep(openDuration)
      let now = yield* Clock.currentTimeMillis
      let delay = Duration.zero
      for (let attempt = 1; attempt <= consecutiveOpenings; attempt++) {
        const result = yield* Effect.exit(step(now, attempt))
        if (Exit.isFailure(result)) break
        delay = result.value[1]
        now += Duration.toMillis(delay)
      }
      return delay
    })
}

/**
 * Policy that decides when a Closed circuit opens.
 *
 * **Details**
 *
 * - `Consecutive` opens after `failures` failures in a row, in order of
 *   completion. Only a `Success` resets the streak.
 * - `Rate` keeps the last `size` recorded outcomes and opens when the
 *   fraction of failures reaches `threshold`, once at least `minimumCalls`
 *   outcomes are recorded.
 *
 * `Ignored` outcomes never count towards either policy.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type TripPolicy =
  | { readonly _tag: "Consecutive"; readonly failures: number }
  | { readonly _tag: "Rate"; readonly threshold: number; readonly minimumCalls: number; readonly size: number }

/**
 * Creates a trip policy that opens after `failures` consecutive failures.
 *
 * **Gotchas**
 *
 * Throws a `RangeError` when `failures` is not an integer of at least 1.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const consecutive = (failures: number): TripPolicy => {
  if (!Number.isInteger(failures) || failures < 1) {
    throw new RangeError(`CircuitBreaker.consecutive: failures must be an integer >= 1, got ${failures}`)
  }
  return { _tag: "Consecutive", failures }
}

/**
 * Creates a trip policy that opens when the failure rate over the last
 * recorded calls reaches a threshold.
 *
 * **Details**
 *
 * `threshold` is a fraction in `[0, 1]` and defaults to `0.5`. `size` is the
 * number of recorded calls kept and defaults to `100`. `minimumCalls`
 * defaults to `size`. A ring with no failures never opens the circuit.
 *
 * **Gotchas**
 *
 * Throws a `RangeError` when `threshold` is outside `[0, 1]`, when `size` is
 * not an integer of at least 1, or when `minimumCalls` is not an integer
 * between 1 and `size`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const rate = (options: {
  readonly threshold?: number | undefined
  readonly size?: number | undefined
  readonly minimumCalls?: number | undefined
}): TripPolicy => {
  const threshold = options.threshold ?? 0.5
  const size = options.size ?? 100
  const minimumCalls = options.minimumCalls ?? size
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new RangeError(`CircuitBreaker.rate: threshold must be in [0, 1], got ${threshold}`)
  }
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`CircuitBreaker.rate: size must be an integer >= 1, got ${size}`)
  }
  if (!Number.isInteger(minimumCalls) || minimumCalls < 1 || minimumCalls > size) {
    throw new RangeError(`CircuitBreaker.rate: minimumCalls must be an integer in [1, size], got ${minimumCalls}`)
  }
  return { _tag: "Rate", threshold, minimumCalls, size }
}

/**
 * Classification of a call's exit, as returned by a `classify` function.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type Outcome = Outcome.Success | Outcome.Ignored | Outcome.Failure

/**
 * Members of the `Outcome` union.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export declare namespace Outcome {
  /**
   * Outcome for a call that shows the dependency is healthy.
   *
   * @stability experimental
   * @category models
   * @since 4.0.6
   */
  export interface Success {
    readonly _tag: "Success"
  }

  /**
   * Outcome for a call that says nothing about the dependency's health.
   *
   * @stability experimental
   * @category models
   * @since 4.0.6
   */
  export interface Ignored {
    readonly _tag: "Ignored"
  }

  /**
   * Outcome for a call that counts against the dependency, with an optional
   * hint for how long to stay open.
   *
   * @stability experimental
   * @category models
   * @since 4.0.6
   */
  export interface Failure {
    readonly _tag: "Failure"
    readonly retryAfter?: Duration.Duration | undefined
  }
}

/**
 * Outcome that records a success and resets a consecutive failure streak.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const success: Outcome = { _tag: "Success" }

/**
 * Outcome that records nothing.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const ignored: Outcome = { _tag: "Ignored" }

/**
 * Creates an outcome that records a failure.
 *
 * **Details**
 *
 * `retryAfter` is a hint, such as an HTTP `Retry-After` header. It is used
 * only when this failure opens the circuit, can only lengthen the opening,
 * and is capped at `maxOpenDuration`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const failure = (options?: { readonly retryAfter?: Duration.Input | undefined }): Outcome => ({
  _tag: "Failure",
  retryAfter: options?.retryAfter === undefined ? undefined : Duration.fromInputUnsafe(options.retryAfter)
})

/**
 * State of one circuit, as read from the store.
 *
 * **Details**
 *
 * - `Open.retryAfter` is the remaining open time, clamped to zero. A circuit
 *   past its open time reads as Open until the next call moves it to
 *   HalfOpen.
 * - `HalfOpen.probing` is `false` when no probe currently holds the slot.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type State =
  | { readonly _tag: "Closed"; readonly key: string }
  | {
    readonly _tag: "Open"
    readonly key: string
    readonly retryAfter: Duration.Duration
    readonly consecutiveOpenings: number
  }
  | { readonly _tag: "HalfOpen"; readonly key: string; readonly probing: boolean; readonly consecutiveOpenings: number }

/**
 * Transition between circuit states made by a breaker.
 *
 * **Details**
 *
 * Only the legal edges appear. `from` tells a failed probe (`"HalfOpen"`)
 * apart from a fresh trip (`"Closed"`).
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type Transition =
  | {
    readonly key: string
    readonly from: "Closed" | "HalfOpen"
    readonly to: "Open"
    readonly retryAfter: Duration.Duration
    readonly consecutiveOpenings: number
  }
  | { readonly key: string; readonly from: "Open"; readonly to: "HalfOpen" }
  | { readonly key: string; readonly from: "HalfOpen"; readonly to: "Closed" }

/**
 * Error reason for a call rejected by an Open circuit.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export class CircuitOpen extends Schema.Error<CircuitOpen>("effect/persistence/CircuitBreaker/CircuitOpen")({
  _tag: Schema.tag("CircuitOpen"),
  key: Schema.String,
  retryAfter: Schema.DurationFromMillis
}) {
  /**
   * Public message used when an Open circuit rejects a call.
   *
   * @stability experimental
   * @since 4.0.6
   */
  override get message(): string {
    return `Circuit open`
  }
}

/**
 * Error reason for a call rejected while a HalfOpen circuit's probe runs.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export class CircuitHalfOpen extends Schema.Error<CircuitHalfOpen>(
  "effect/persistence/CircuitBreaker/CircuitHalfOpen"
)({
  _tag: Schema.tag("CircuitHalfOpen"),
  key: Schema.String
}) {
  /**
   * Public message used when a HalfOpen circuit rejects a call.
   *
   * @stability experimental
   * @since 4.0.6
   */
  override get message(): string {
    return `Circuit half-open`
  }
}

/**
 * Error reason for failures in the backing `CircuitBreakerStore`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export class CircuitBreakerStoreError extends Schema.Error<CircuitBreakerStoreError>(
  "effect/persistence/CircuitBreaker/CircuitBreakerStoreError"
)({
  _tag: Schema.tag("CircuitBreakerStoreError"),
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

/**
 * Union of reasons carried by `CircuitBreakerError`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export type CircuitBreakerErrorReason = CircuitOpen | CircuitHalfOpen | CircuitBreakerStoreError

/**
 * Schema for all reasons that can be carried by `CircuitBreakerError`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export const CircuitBreakerErrorReason: Schema.Union<[
  typeof CircuitOpen,
  typeof CircuitHalfOpen,
  typeof CircuitBreakerStoreError
]> = Schema.Union([CircuitOpen, CircuitHalfOpen, CircuitBreakerStoreError])

/**
 * Runtime type identifier for `CircuitBreakerError`.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.6
 */
export const ErrorTypeId: ErrorTypeId = "~effect/persistence/CircuitBreaker/CircuitBreakerError"

/**
 * Type-level identifier used to brand `CircuitBreakerError` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.6
 */
export type ErrorTypeId = "~effect/persistence/CircuitBreaker/CircuitBreakerError"

/**
 * Error raised by circuit breaker operations, wrapping a concrete failure
 * `reason`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export class CircuitBreakerError extends Schema.Error<CircuitBreakerError>(ErrorTypeId)({
  _tag: Schema.tag("CircuitBreakerError"),
  reason: CircuitBreakerErrorReason
}) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: {
    readonly reason: CircuitBreakerErrorReason
  }) {
    if ("cause" in props.reason) {
      super({
        ...props,
        cause: props.reason.cause
      } as any)
    } else {
      super(props)
    }
  }

  /**
   * Marks this value as a circuit breaker error for runtime guards.
   *
   * @stability experimental
   * @since 4.0.6
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

  override get message(): string {
    return this.reason.message
  }
}

/**
 * Store that holds circuit state for a `CircuitBreaker`.
 *
 * **Details**
 *
 * - `admit` decides whether a call may run. It returns an `Admission`, or
 *   fails with `CircuitOpen` or `CircuitHalfOpen`. Its scope stays open for
 *   the duration of the call.
 * - `record` applies an outcome atomically. Outcomes stamped with an older
 *   generation change nothing. `openFor` is how long the circuit stays open
 *   if this record opens it.
 * - `state` reads the state of a key without changing it.
 *
 * Each operation reads "now" inside the store.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export class CircuitBreakerStore extends Context.Service<CircuitBreakerStore, {
  readonly admit: (key: string) => Effect.Effect<Admission, CircuitBreakerError, Scope.Scope>
  readonly record: (options: {
    readonly key: string
    readonly generation: number
    readonly outcome: "Success" | "Failure" | "Ignored"
    readonly tripPolicy: TripPolicy
    readonly openFor: Duration.Duration
  }) => Effect.Effect<Transition | undefined, CircuitBreakerError>
  readonly state: (key: string) => Effect.Effect<State, CircuitBreakerError>
}>()("effect/persistence/CircuitBreaker/CircuitBreakerStore") {}

/**
 * Permit returned by `CircuitBreakerStore.admit`.
 *
 * **Details**
 *
 * - `generation` is an opaque fencing token to pass back to `record`.
 * - `probe` is `true` when this call is the HalfOpen probe.
 * - `consecutiveOpenings` counts the openings since the circuit last closed.
 * - `transition` is the Open to HalfOpen transition this admission made, if
 *   any.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface Admission {
  readonly generation: number
  readonly probe: boolean
  readonly consecutiveOpenings: number
  readonly transition: Transition | undefined
}

interface MemoryEntry {
  state: "Closed" | "Open" | "HalfOpen"
  generation: number
  lastActivity: number
  streak: number
  ring: Array<boolean>
  ringFailures: number
  openUntil: number
  consecutiveOpenings: number
  probing: boolean
}

/**
 * Creates an in-memory `CircuitBreakerStore` layer.
 *
 * **Details**
 *
 * State is local to the layer and uses `Clock`. `idleTimeToLive` (default
 * one hour) drops idle keys: a Closed key once it has been idle that long, an
 * Open key that long after its open time ends, and a HalfOpen key only when
 * no probe is running. A dropped key starts again as Closed.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.6
 */
export const layerStoreMemory = (options?: {
  readonly idleTimeToLive?: Duration.Input | undefined
}): Layer.Layer<CircuitBreakerStore> =>
  Layer.sync(CircuitBreakerStore, () => {
    const idleTimeToLive = Duration.toMillis(Duration.fromInputUnsafe(options?.idleTimeToLive ?? "1 hour"))
    const entries = new Map<string, MemoryEntry>()
    let nextGeneration = 0
    let lastSweep = 0

    const isExpired = (entry: MemoryEntry, now: number) => {
      switch (entry.state) {
        case "Closed":
          return now - entry.lastActivity >= idleTimeToLive
        case "Open":
          return now - Math.max(entry.lastActivity, entry.openUntil) >= idleTimeToLive
        case "HalfOpen":
          return !entry.probing && now - entry.lastActivity >= idleTimeToLive
      }
    }

    const sweep = (now: number) => {
      if (now - lastSweep < idleTimeToLive) return
      lastSweep = now
      for (const [key, entry] of entries) {
        if (isExpired(entry, now)) entries.delete(key)
      }
    }

    const lookup = (key: string, now: number): MemoryEntry | undefined => {
      const entry = entries.get(key)
      return entry !== undefined && !isExpired(entry, now) ? entry : undefined
    }

    const resetCounters = (entry: MemoryEntry) => {
      entry.streak = 0
      entry.ring = []
      entry.ringFailures = 0
    }

    const open = (
      key: string,
      entry: MemoryEntry,
      from: "Closed" | "HalfOpen",
      openFor: Duration.Duration,
      now: number
    ): Transition => {
      entry.state = "Open"
      entry.generation = nextGeneration++
      entry.openUntil = now + Duration.toMillis(openFor)
      entry.consecutiveOpenings++
      entry.probing = false
      resetCounters(entry)
      return { key, from, to: "Open", retryAfter: openFor, consecutiveOpenings: entry.consecutiveOpenings }
    }

    const trips = (entry: MemoryEntry, policy: TripPolicy) => {
      if (policy._tag === "Consecutive") return entry.streak >= policy.failures
      return entry.ring.length >= policy.minimumCalls && entry.ringFailures > 0 &&
        entry.ringFailures / entry.ring.length >= policy.threshold
    }

    return CircuitBreakerStore.of({
      admit: (key) =>
        Effect.flatMap(Clock.currentTimeMillis, (now) => {
          sweep(now)
          let entry = lookup(key, now)
          if (entry === undefined) {
            entry = {
              state: "Closed",
              generation: nextGeneration++,
              lastActivity: now,
              streak: 0,
              ring: [],
              ringFailures: 0,
              openUntil: 0,
              consecutiveOpenings: 0,
              probing: false
            }
            entries.set(key, entry)
          }
          let transition: Transition | undefined
          switch (entry.state) {
            case "Open": {
              if (now < entry.openUntil) {
                return Effect.fail(
                  new CircuitBreakerError({
                    reason: new CircuitOpen({ key, retryAfter: Duration.millis(entry.openUntil - now) })
                  })
                )
              }
              entry.state = "HalfOpen"
              transition = { key, from: "Open", to: "HalfOpen" }
              break
            }
            case "HalfOpen": {
              if (entry.probing) {
                return Effect.fail(new CircuitBreakerError({ reason: new CircuitHalfOpen({ key }) }))
              }
              break
            }
          }
          entry.lastActivity = now
          if (entry.state === "HalfOpen") {
            entry.probing = true
            entry.generation = nextGeneration++
          }
          return Effect.succeed<Admission>({
            generation: entry.generation,
            probe: entry.state === "HalfOpen",
            consecutiveOpenings: entry.consecutiveOpenings,
            transition
          })
        }),
      record: ({ generation, key, openFor, outcome, tripPolicy }) =>
        Effect.map(Clock.currentTimeMillis, (now): Transition | undefined => {
          const entry = lookup(key, now)
          if (entry === undefined || entry.generation !== generation) return undefined
          entry.lastActivity = now
          if (entry.state === "HalfOpen") {
            switch (outcome) {
              case "Ignored": {
                entry.probing = false
                return undefined
              }
              case "Failure":
                return open(key, entry, "HalfOpen", openFor, now)
              case "Success": {
                entry.state = "Closed"
                entry.generation = nextGeneration++
                entry.consecutiveOpenings = 0
                entry.probing = false
                resetCounters(entry)
                return { key, from: "HalfOpen", to: "Closed" }
              }
            }
          }
          if (entry.state !== "Closed" || outcome === "Ignored") return undefined
          const failed = outcome === "Failure"
          entry.streak = failed ? entry.streak + 1 : 0
          if (tripPolicy._tag === "Rate") {
            entry.ring.push(failed)
            if (failed) entry.ringFailures++
            while (entry.ring.length > tripPolicy.size) {
              if (entry.ring.shift()) entry.ringFailures--
            }
          }
          return trips(entry, tripPolicy) ? open(key, entry, "Closed", openFor, now) : undefined
        }),
      state: (key) =>
        Effect.map(Clock.currentTimeMillis, (now): State => {
          const entry = lookup(key, now)
          if (entry === undefined) return { _tag: "Closed", key }
          switch (entry.state) {
            case "Closed":
              return { _tag: "Closed", key }
            case "Open":
              return {
                _tag: "Open",
                key,
                retryAfter: Duration.millis(Math.max(0, entry.openUntil - now)),
                consecutiveOpenings: entry.consecutiveOpenings
              }
            case "HalfOpen":
              return { _tag: "HalfOpen", key, probing: entry.probing, consecutiveOpenings: entry.consecutiveOpenings }
          }
        })
    })
  })
