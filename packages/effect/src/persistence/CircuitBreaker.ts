/**
 * Protects calls to unhealthy downstream services by rejecting them while a
 * circuit is open.
 *
 * A `CircuitBreaker` is identified by its `key`. Its state lives in a
 * `CircuitBreakerStore`, so breakers that share a key and a store also share
 * their state. Use `layerStoreMemory` for a process-local breaker and
 * `layerStoreRedis` for a breaker shared across processes.
 *
 * Generations keep the state machine consistent: outcomes from an earlier
 * generation are ignored. Use `halfOpen: { successes: n }` and the built-in
 * waiting jitter to spread recovery before all workers resume.
 *
 * Retries, timeouts, fallbacks and rate limiting are intentionally not part of
 * this module; compose them with `Effect.retry`, `Effect.timeout`,
 * `Effect.catchReason` and `RateLimiter`.
 *
 * **Telemetry**
 *
 * Every breaker emits the signals below. `circuit_breaker.name` defaults to
 * `key`. Dynamic keys, such as per-tenant keys, should set a bounded `name` to
 * avoid unbounded metric cardinality. Add your own attributes with the usual
 * Effect mechanisms: `Metric.CurrentMetricAttributes` for metrics,
 * `Effect.annotateLogs` for logs and the caller's span for span attributes.
 *
 * In the table, N means `circuit_breaker.name`. State values are `closed`,
 * `half_open` and `open`.
 *
 * | Signal | Name | Attributes besides N | When |
 * | --- | --- | --- | --- |
 * | Counter | `effect_circuit_breaker_calls` | `circuit_breaker.outcome` | Once per call: `success`, `failure`, `ignored`, returned `rejected`, or `store_error` on acquire failure. Waiting emits nothing until admission. Record failures retain the classified outcome. |
 * | Counter | `effect_circuit_breaker_transitions` | `circuit_breaker.state.from`, `circuit_breaker.state.to` | Per locally caused transition. |
 * | Current span attributes | No new span | `circuit_breaker.outcome`, boolean `circuit_breaker.rejected` | Per call, if a current span exists. |
 * | Current span event | `effect.circuit_breaker.rejected` | `circuit_breaker.state` | Only for a rejection returned to the caller. |
 * | Log | `Circuit breaker transition` | `circuit_breaker.state.from`, `circuit_breaker.state.to`, `circuit_breaker.generation` | Warning entering Open, Info entering Closed, Debug entering HalfOpen. |
 * | Warning log | `Circuit breaker internal failure` | `circuit_breaker.operation`, cause | Swallowed internal failures in `record`, `open_duration` or `renew_probe_lease`. |
 *
 * Acquire failures are returned to the caller and counted as `store_error`,
 * without a warning log.
 * No state gauge is emitted because shared state can change in other processes.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import { dual, flow, identity } from "../Function.ts"
import { makeMemoryStore } from "../internal/circuitBreakerMemory.ts"
import { makeRedisStore } from "../internal/circuitBreakerRedis.ts"
import * as Layer from "../Layer.ts"
import * as Metric from "../Metric.ts"
import * as Option from "../Option.ts"
import * as PubSub from "../PubSub.ts"
import * as Pull from "../Pull.ts"
import * as Random from "../Random.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as Redis from "./Redis.ts"

/**
 * Runtime type identifier for `CircuitBreaker` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.0
 */
export const TypeId: TypeId = "~effect/persistence/CircuitBreaker"

/**
 * Type-level identifier used to brand `CircuitBreaker` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.0
 */
export type TypeId = "~effect/persistence/CircuitBreaker"

/**
 * A circuit breaker for a single `key`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface CircuitBreaker<in E = unknown> {
  readonly [TypeId]: TypeId

  /**
   * The key this breaker was created with. Breakers with the same key in the
   * same store share their state. For dynamic keys, set `name` when creating the
   * breaker to bound metric cardinality.
   */
  readonly key: string

  /**
   * Runs `effect` if the circuit permits it and records its outcome. Fails
   * with `CircuitBreakerError` without running `effect` when the circuit
   * rejects the call or the store cannot be reached.
   *
   * **Details**
   *
   * Set `onRejected: "wait"` for background workers to wait until a permit is
   * available. Wrap the work, not the blocking wait for work:
   * `queue.take((job) => breaker.execute(process(job), { onRejected: "wait" }))`.
   * The worker holds its claimed job while waiting, without failing it.
   * Open circuits wait until `retryAt` plus jitter; half-open circuits poll
   * with backoff from 100 ms to 5 seconds and wake on fresh local transitions.
   * Store failures still fail immediately. The default is `"fail"`.
   *
   * **Gotchas**
   *
   * Keep queue takes, stream pulls and waits for external signals outside
   * `execute`: the permit belongs to the generation at acquisition time and
   * can become stale while idle. Persisted queues may count an attempt on
   * claim; long holds must respect their lock renewal or visibility rules.
   */
  readonly execute: <A, E2 extends E, R>(
    effect: Effect.Effect<A, E2, R>,
    options?: ExecuteOptions | undefined
  ) => Effect.Effect<A, E2 | CircuitBreakerError, R>

  /**
   * Reads the current state from the store without modifying it.
   */
  readonly state: Effect.Effect<State, CircuitBreakerError>

  /**
   * State transitions caused by calls in this process. With a shared store,
   * transitions caused by other processes are not emitted; read `state` to
   * observe them.
   */
  readonly transitions: Stream.Stream<Transition>
}

/**
 * Options for `execute`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExecuteOptions {
  /**
   * `"fail"` (default) fails rejected calls with `CircuitBreakerError`.
   * `"wait"` waits until the circuit admits the call, for background workers.
   *
   * **Details**
   *
   * Wrap the work, not a blocking wait for work:
   * `queue.take((job) => breaker.execute(process(job), { onRejected: "wait" }))`.
   * Keep queue takes, stream pulls and waits for external signals outside
   * `execute`. A permit belongs to the generation at acquisition time, so an
   * idle permit can become stale and still run work while the circuit is open.
   *
   * A waiting worker holds its claimed job until the circuit admits it. This is
   * safe for queues that renew claims while a job is processed, such as
   * `PersistedQueue`, where waiting adds no failed attempt. For queues with a
   * fixed claim window, the consumer must
   * extend the claim. Queues that remove a job when it is taken are not
   * suitable.
   */
  readonly onRejected?: "fail" | "wait" | undefined
}

/**
 * Options for `make`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options<E> {
  /**
   * Identifies the circuit. Breakers with the same key in the same store share
   * their state, so a distributed store shares it across processes. Use a key
   * per dependency, or per dependency and tenant (e.g. `"payments:tenant-123"`).
   * For dynamic keys, set `name` to bound metric cardinality.
   */
  readonly key: string
  /**
   * Decides when a closed circuit opens. Create it with `consecutiveFailures`
   * or `failureRate`.
   */
  readonly policy: Policy
  /**
   * How long the circuit stays open. The schedule's delay for the n-th
   * consecutive opening is used.
   */
  readonly openFor: Duration.Input | Schedule.Schedule<unknown, number>
  readonly halfOpen?: {
    /** Concurrent probe calls allowed while half-open. Defaults to `1`. */
    readonly permits?: number | undefined
    /** Successful probes required to close the circuit. Defaults to `1`. */
    readonly successes?: number | undefined
  } | undefined
  /**
   * Decides how a completed call counts against the circuit: `"failure"`, `"success"`, or `"ignored"`
   * (neither trips nor resets it, e.g. a 404 that says nothing about the downstream's health).
   * Interrupted calls are always ignored and never reach this function. If it throws, the call
   * counts as a failure. Defaults to success for a successful exit and failure otherwise.
   *
   * **Example** (Classifying typed errors exhaustively)
   *
   * ```ts import.meta.vitest
   * import { Data, Effect, Exit, Match, Option } from "effect"
   * import { CircuitBreaker } from "effect/persistence"
   *
   * class CardDeclined extends Data.TaggedError("CardDeclined")<{}> {}
   * class ProviderDown extends Data.TaggedError("ProviderDown")<{}> {}
   * type PaymentError = CardDeclined | ProviderDown
   *
   * // Annotate the exit so the breaker only accepts effects failing with PaymentError
   * const classify = (exit: Exit.Exit<unknown, PaymentError>): CircuitBreaker.Outcome =>
   *   Exit.isSuccess(exit) ? "success" : Option.match(Exit.findErrorOption(exit), {
   *     onNone: () => "failure", // defects
   *     onSome: Match.type<PaymentError>().pipe(
   *       Match.withReturnType<CircuitBreaker.Outcome>(),
   *       // A missing tag is a compile error; use Match.tag + Match.orElse for a default
   *       Match.tagsExhaustive({
   *         CardDeclined: () => "ignored", // the caller's problem, not the provider's
   *         ProviderDown: () => "failure"
   *       })
   *     )
   *   })
   *
   * const program = Effect.gen(function*() {
   *   const breaker = yield* CircuitBreaker.make({
   *     key: "payments",
   *     policy: CircuitBreaker.consecutiveFailures(1),
   *     openFor: "30 seconds",
   *     classify
   *   })
   *   yield* Effect.ignore(breaker.execute(Effect.fail(new CardDeclined())))
   *   const afterDeclined = (yield* breaker.state)._tag
   *   yield* Effect.ignore(breaker.execute(Effect.fail(new ProviderDown())))
   *   const afterOutage = (yield* breaker.state)._tag
   *   return [afterDeclined, afterOutage]
   * })
   *
   * const states = await Effect.runPromise(program.pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
   * states // => ["Closed", "Open"]
   * ```
   */
  readonly classify?: ((exit: Exit.Exit<unknown, E>) => Outcome) | undefined
  /**
   * Value of the `circuit_breaker.name` telemetry attribute. Defaults to `key`.
   *
   * **Example** (Grouping per-tenant breakers under one name)
   *
   * ```ts import.meta.vitest
   * import { Effect, Metric } from "effect"
   * import { CircuitBreaker } from "effect/persistence"
   *
   * const breakerFor = (tenant: string) =>
   *   CircuitBreaker.make({
   *     key: `payments:${tenant}`,
   *     name: "payments", // one metric series instead of one per tenant
   *     policy: CircuitBreaker.consecutiveFailures(5),
   *     openFor: "30 seconds"
   *   })
   *
   * const program = Effect.gen(function*() {
   *   const tenantA = yield* breakerFor("tenant-a")
   *   const tenantB = yield* breakerFor("tenant-b")
   *   yield* tenantA.execute(Effect.void)
   *   yield* tenantB.execute(Effect.void)
   *
   *   const successes = CircuitBreaker.callsMetric.pipe(Metric.withAttributes({
   *     "circuit_breaker.name": "payments",
   *     "circuit_breaker.outcome": "success",
   *     service: "checkout"
   *   }))
   *   return (yield* Metric.value(successes)).count
   * }).pipe(
   *   // Extra metric attributes come from the context, as for any Effect metric
   *   Effect.provideService(Metric.CurrentMetricAttributes, { service: "checkout" })
   * )
   *
   * const count = await Effect.runPromise(program.pipe(Effect.provide(CircuitBreaker.layerStoreMemory)))
   * count // => 2
   * ```
   */
  readonly name?: string | undefined
}

/**
 * Decides when a closed circuit opens.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Policy = ConsecutiveFailures | FailureRate

/**
 * Opens the circuit after `failures` consecutive failures.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ConsecutiveFailures {
  readonly _tag: "ConsecutiveFailures"
  readonly failures: number
}

/**
 * Opens the circuit when the failure rate within a time-based sliding window
 * of `buckets` buckets reaches `threshold`, once `minimumCalls` calls have been
 * recorded in the window.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface FailureRate {
  readonly _tag: "FailureRate"
  readonly threshold: number
  readonly minimumCalls: number
  readonly window: Duration.Duration
  readonly buckets: number
}

/**
 * Creates a `ConsecutiveFailures` policy.
 *
 * **Details**
 *
 * `failures` is rounded down and raised to at least `1`.
 *
 * @stability unstable
 * @category policies
 * @since 4.1.0
 */
export const consecutiveFailures = (failures: number): Policy => ({
  _tag: "ConsecutiveFailures",
  failures: Math.max(1, Math.floor(failures))
})

/**
 * Creates a `FailureRate` policy.
 *
 * **Details**
 *
 * `threshold` is a fraction between `0` and `1` (e.g. `0.5` for 50%); values
 * outside that range are clamped, so `50` behaves like `1`. `minimumCalls`
 * defaults to `10` and `buckets` to `10`; both are rounded down and raised to
 * at least `1`. `window` is at least one millisecond.
 *
 * @stability unstable
 * @category policies
 * @since 4.1.0
 */
export const failureRate = (options: {
  readonly threshold: number
  readonly minimumCalls?: number | undefined
  readonly window: Duration.Input
  readonly buckets?: number | undefined
}): Policy => ({
  _tag: "FailureRate",
  threshold: Math.min(1, Math.max(Number.MIN_VALUE, options.threshold)),
  minimumCalls: Math.max(1, Math.floor(options.minimumCalls ?? 10)),
  window: Duration.max(Duration.fromInputUnsafe(options.window), Duration.millis(1)),
  buckets: Math.max(1, Math.floor(options.buckets ?? 10))
})

/**
 * The state of a circuit.
 *
 * **Details**
 *
 * `generation` increases on every transition. `trips` counts consecutive
 * openings and resets when the circuit closes.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type State =
  | { readonly _tag: "Closed"; readonly generation: number }
  | {
    readonly _tag: "Open"
    readonly generation: number
    readonly trips: number
    /** Epoch millis after which the next call moves the circuit to half-open. */
    readonly retryAt: number
  }
  | {
    readonly _tag: "HalfOpen"
    readonly generation: number
    readonly trips: number
    readonly inFlight: number
    readonly successes: number
  }

/**
 * A state transition.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Transition {
  readonly key: string
  readonly from: State["_tag"]
  readonly to: State["_tag"]
  /** The generation after the transition. */
  readonly generation: number
  /** Epoch millis of the transition. */
  readonly at: number
}

/**
 * The outcome recorded for a call. An `"ignored"` call neither trips nor resets
 * the circuit.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Outcome = "success" | "failure" | "ignored"

/**
 * Permission to run a call, returned by `CircuitBreakerStore.acquire`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Permit {
  /** Generation in which the permit was granted. Outcomes for older generations are ignored. */
  readonly generation: number
  /** Set when the permit occupies a half-open probe slot. */
  readonly probeId: string | undefined
  /** `trips` of the state the permit was granted in; selects the next `openFor` duration. */
  readonly trips: number
}

/**
 * Result of `CircuitBreakerStore.acquire`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type AcquireResult =
  | {
    readonly _tag: "Permitted"
    readonly permit: Permit
    /** Set when acquiring moved the circuit from `Open` to `HalfOpen`. */
    readonly transition: Transition | undefined
  }
  | {
    readonly _tag: "Rejected"
    readonly state: "Open" | "HalfOpen"
    /** Epoch millis; only known when the circuit is `Open`. */
    readonly retryAt: number | undefined
  }

/**
 * Runtime type identifier for `CircuitBreakerError`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.0
 */
export const ErrorTypeId: ErrorTypeId = "~effect/persistence/CircuitBreaker/CircuitBreakerError"

/**
 * Type-level identifier for `CircuitBreakerError`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.0
 */
export type ErrorTypeId = "~effect/persistence/CircuitBreaker/CircuitBreakerError"

const rejectedStateLabels = {
  Open: "open",
  HalfOpen: "half-open"
} as const

/**
 * Error reason used when the circuit rejects a call.
 *
 * **Details**
 *
 * `state` is `"Open"` while the circuit cools down, and `"HalfOpen"` while all
 * probe permits are taken. `retryAfter` is the remaining cooldown and is only
 * set for `"Open"`, because the end of a running probe is unknown.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CircuitBreakerRejected extends Schema.TaggedError<CircuitBreakerRejected>(
  "effect/persistence/CircuitBreaker/CircuitBreakerRejected"
)("CircuitBreakerRejected", {
  key: Schema.String,
  state: Schema.Literals(["Open", "HalfOpen"]),
  retryAfter: Schema.optional(Schema.DurationFromMillis)
}) {
  /**
   * Public message used when the circuit rejects a call.
   *
   * @stability unstable
   * @since 4.1.0
   */
  override get message(): string {
    return `Circuit breaker "${this.key}" rejected the call because it is ${rejectedStateLabels[this.state]}`
  }
}

/**
 * Error reason for failures in the backing `CircuitBreakerStore`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CircuitBreakerStoreError extends Schema.TaggedError<CircuitBreakerStoreError>(
  "effect/persistence/CircuitBreaker/CircuitBreakerStoreError"
)("CircuitBreakerStoreError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

/**
 * Union of reasons carried by `CircuitBreakerError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type CircuitBreakerErrorReason = CircuitBreakerRejected | CircuitBreakerStoreError

/**
 * Schema for all reasons that can be carried by `CircuitBreakerError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export const CircuitBreakerErrorReason: Schema.Union<[
  typeof CircuitBreakerRejected,
  typeof CircuitBreakerStoreError
]> = Schema.Union([CircuitBreakerRejected, CircuitBreakerStoreError])

/**
 * Error raised by circuit breaker operations. When returned by `execute`, the
 * wrapped effect was not run.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CircuitBreakerError extends Schema.TaggedError<CircuitBreakerError>(ErrorTypeId)("CircuitBreakerError", {
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
   * @stability unstable
   * @since 4.1.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

  override get message(): string {
    return this.reason.message
  }
}

/**
 * Returns `true` if `u` is a `CircuitBreakerError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.1.0
 */
export const isCircuitBreakerError = (u: unknown): u is CircuitBreakerError =>
  typeof u === "object" && u !== null && ErrorTypeId in u

/**
 * Atomic storage for circuit state.
 *
 * **Details**
 *
 * Every operation must be atomic per `key`. Stores read the current time from
 * `Clock`. Configuration is passed with every call, so stores hold no
 * per-breaker configuration.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class CircuitBreakerStore extends Context.Service<
  CircuitBreakerStore,
  {
    /**
     * Requests permission to run a call.
     *
     * **Details**
     *
     * - `Closed`: always permitted, without a probe slot.
     * - `Open` with `now < retryAt`: rejected with `retryAt`.
     * - `Open` with `now >= retryAt`: transitions to `HalfOpen` (generation + 1,
     *   `successes` 0, `inFlight` 0) and continues as `HalfOpen`.
     * - `HalfOpen`: permitted with a fresh `probeId` if fewer than
     *   `halfOpenPermits` probes are in flight, otherwise rejected.
     */
    readonly acquire: (options: {
      readonly key: string
      readonly halfOpenPermits: number
    }) => Effect.Effect<AcquireResult, CircuitBreakerError>

    /**
     * Renews the lease of a held probe permit until interrupted. Stores without
     * leases never complete. Renewing an expired or released probe is a no-op;
     * store failures fail this effect.
     */
    readonly renewProbeLease: (options: {
      readonly key: string
      readonly permit: Permit
    }) => Effect.Effect<never, CircuitBreakerError>

    /**
     * Records the outcome of a permitted call.
     *
     * **Details**
     *
     * Always releases the permit's probe slot, if any. The outcome itself is
     * ignored unless `permit.generation` equals the current generation.
     *
     * - `Closed`: `policy` decides whether to open. On opening: generation + 1,
     *   `trips = permit.trips + 1`, `retryAt = now + openForMillis`, counters
     *   cleared.
     * - `HalfOpen`: `failure` opens as above; `success` increments `successes`
     *   and closes once it reaches `halfOpenSuccesses` (generation + 1,
     *   `trips` 0, counters cleared). `ignored` only releases the slot.
     */
    readonly record: (options: {
      readonly key: string
      readonly permit: Permit
      readonly outcome: Outcome
      readonly policy: Policy
      readonly halfOpenSuccesses: number
      readonly openForMillis: number
    }) => Effect.Effect<Option.Option<Transition>, CircuitBreakerError>

    /**
     * Reads the current state. Unknown keys are `Closed` with generation `0`.
     */
    readonly state: (key: string) => Effect.Effect<State, CircuitBreakerError>
  }
>()("effect/persistence/CircuitBreaker/CircuitBreakerStore") {}

/**
 * Counter of circuit breaker calls by name and classified outcome.
 *
 * @stability unstable
 * @category metrics
 * @since 4.1.0
 */
export const callsMetric: Metric.Counter<number> = Metric.counter("effect_circuit_breaker_calls", {
  description: "Circuit breaker calls by outcome",
  incremental: true
})

/**
 * Counter of locally caused circuit breaker state transitions.
 *
 * @stability unstable
 * @category metrics
 * @since 4.1.0
 */
export const transitionsMetric: Metric.Counter<number> = Metric.counter("effect_circuit_breaker_transitions", {
  description: "Locally caused circuit breaker state transitions",
  incremental: true
})

const transitionLogLevels = { Closed: "Info", HalfOpen: "Debug", Open: "Warn" } as const

const stateNames = { Closed: "closed", HalfOpen: "half_open", Open: "open" } as const

// Telemetry signals, see the table in the module documentation.
const observeCall = Effect.fnUntraced(function*(
  attributes: Metric.Metric.AttributeSet,
  outcome: Outcome | "rejected" | "store_error"
) {
  const callAttributes = { ...attributes, "circuit_breaker.outcome": outcome }
  yield* Metric.update(Metric.withAttributes(callsMetric, callAttributes), 1)
  yield* Effect.annotateCurrentSpan({ ...callAttributes, "circuit_breaker.rejected": outcome === "rejected" })
})

const observeTransition = Effect.fnUntraced(function*(attributes: Metric.Metric.AttributeSet, transition: Transition) {
  const transitionAttributes = {
    ...attributes,
    "circuit_breaker.state.from": stateNames[transition.from],
    "circuit_breaker.state.to": stateNames[transition.to]
  }
  yield* Metric.update(Metric.withAttributes(transitionsMetric, transitionAttributes), 1)
  yield* Effect.logWithLevel(transitionLogLevels[transition.to])("Circuit breaker transition").pipe(
    Effect.annotateLogs({ ...transitionAttributes, "circuit_breaker.generation": transition.generation })
  )
})

const observeRejection = Effect.fnUntraced(function*(
  attributes: Metric.Metric.AttributeSet,
  state: "Open" | "HalfOpen"
) {
  yield* observeCall(attributes, "rejected")
  const span = yield* Effect.option(Effect.currentSpan)
  if (Option.isNone(span)) return
  span.value.event("effect.circuit_breaker.rejected", yield* Clock.currentTimeNanos, {
    ...attributes,
    "circuit_breaker.state": stateNames[state]
  })
})

// Waiting for admission with `onRejected: "wait"`. Never waits on transitions alone:
// Open -> HalfOpen happens lazily on acquire, and probes in other processes publish
// no local transition. Half-open waiters therefore also poll, backing off exponentially.
const halfOpenPollStartMillis = 100
const halfOpenPollCapMillis = 5_000

// Sleeps until the cooldown ends, plus jitter so waiting workers do not hit the store at once.
const sleepUntil = Effect.fnUntraced(function*(retryAt: number) {
  const delay = Math.max(0, retryAt - (yield* Clock.currentTimeMillis))
  const jitter = (yield* Random.next) * Math.min(delay * 0.1, 1_000)
  yield* Effect.sleep(delay + jitter)
})

// Waits for the next local transition, but at most `millis`.
const waitForTransition = (pubsub: PubSub.PubSub<Transition>, millis: number) =>
  Effect.scoped(Effect.gen(function*() {
    const subscription = yield* PubSub.subscribe(pubsub)
    yield* PubSub.take(subscription).pipe(Effect.timeoutOption(millis))
  }))

const acquireWaiting = Effect.fnUntraced(function*(
  acquire: Effect.Effect<AcquireResult, CircuitBreakerError>,
  pubsub: PubSub.PubSub<Transition>,
  interruptible: (effect: Effect.Effect<void>) => Effect.Effect<void>
) {
  let pollDelay = halfOpenPollStartMillis
  while (true) {
    const result = yield* acquire
    if (result._tag === "Permitted") return result
    if (result.retryAt !== undefined) {
      yield* interruptible(sleepUntil(result.retryAt))
      pollDelay = halfOpenPollStartMillis
    } else {
      yield* interruptible(waitForTransition(pubsub, pollDelay))
      pollDelay = Math.min(pollDelay * 2, halfOpenPollCapMillis)
    }
  }
})

// The delay of step `trips` of a fresh schedule, or the last delay if the
// schedule ends or dies earlier. Stores only accept millis, so this turns
// `openFor` into the duration of the next opening. For example, with
// `Schedule.exponential("10 seconds")` the first opening (`trips` 0) lasts 10s,
// the next ones after failed probes 20s, 40s, 80s, and the first opening after
// closing lasts 10s again.
const openDurationMillis = (
  openFor: Schedule.Schedule<unknown, number>,
  trips: number,
  diagnostic: (operation: string, cause: Cause.Cause<unknown>) => Effect.Effect<void>
): Effect.Effect<number> => {
  let millis = 0
  return Effect.gen(function*() {
    const step = yield* Schedule.toStep(openFor)
    const now = yield* Clock.currentTimeMillis
    for (let attempt = 0; attempt <= trips; attempt++) {
      const result = yield* Pull.catchDone(step(now, attempt), () => Effect.undefined)
      if (result === undefined) break
      millis = Duration.toMillis(result[1])
    }
    return millis
  }).pipe(
    Effect.catchCause((cause) => Effect.as(diagnostic("open_duration", cause), millis))
  )
}

const classifyDefault = (exit: Exit.Exit<unknown, unknown>): Outcome => Exit.isSuccess(exit) ? "success" : "failure"

const classifyExit = <E>(
  exit: Exit.Exit<unknown, E>,
  classifier: (exit: Exit.Exit<unknown, E>) => Outcome
): Outcome => {
  if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) return "ignored"
  try {
    return classifier(exit)
  } catch {
    return "failure"
  }
}

/**
 * Creates a `CircuitBreaker` backed by the current `CircuitBreakerStore`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make: <E = unknown>(
  options: Options<E>
) => Effect.Effect<CircuitBreaker<E>, never, CircuitBreakerStore> = Effect.fnUntraced(
  function*<E = unknown>(options: Options<E>) {
    const store = yield* CircuitBreakerStore
    const pubsub = yield* PubSub.unbounded<Transition>()

    // Configuration
    const halfOpenPermits = Math.max(1, Math.floor(options.halfOpen?.permits ?? 1))
    const halfOpenSuccesses = Math.max(1, Math.floor(options.halfOpen?.successes ?? 1))
    const classifier = options.classify ?? classifyDefault
    const openFor = Schedule.isSchedule(options.openFor) ? options.openFor : Schedule.spaced(options.openFor)
    const attributes = { "circuit_breaker.name": options.name ?? options.key }
    const diagnostic = (operation: string, cause: Cause.Cause<unknown>) =>
      Effect.logWarning("Circuit breaker internal failure", cause).pipe(
        Effect.annotateLogs({ ...attributes, "circuit_breaker.operation": operation })
      )

    const publishTransition = Effect.fnUntraced(function*(transition: Transition | undefined) {
      if (transition === undefined) return
      yield* PubSub.publish(pubsub, transition)
      yield* observeTransition(attributes, transition)
    })

    const acquire = store.acquire({ key: options.key, halfOpenPermits }).pipe(
      Effect.tapCause((cause) => Cause.hasInterruptsOnly(cause) ? Effect.void : observeCall(attributes, "store_error"))
    )

    const rejected = Effect.fnUntraced(function*(result: Extract<AcquireResult, { _tag: "Rejected" }>) {
      yield* observeRejection(attributes, result.state)
      const retryAfter = result.retryAt === undefined
        ? undefined
        : Duration.millis(Math.max(0, result.retryAt - (yield* Clock.currentTimeMillis)))
      return yield* Effect.fail(
        new CircuitBreakerError({
          reason: new CircuitBreakerRejected({ key: options.key, state: result.state, retryAfter })
        })
      )
    })

    const record = Effect.fnUntraced(function*(permit: Permit, exit: Exit.Exit<unknown, E>) {
      const outcome = classifyExit(exit, classifier)
      yield* observeCall(attributes, outcome)
      const openForMillis = outcome === "ignored" ? 0 : yield* openDurationMillis(openFor, permit.trips, diagnostic)
      const transition = yield* store.record({
        key: options.key,
        permit,
        outcome,
        policy: options.policy,
        halfOpenSuccesses,
        openForMillis
      })
      yield* publishTransition(Option.getOrUndefined(transition))
    }, Effect.catchCause((cause) => diagnostic("record", cause)))

    // Keeps a probe's lease alive while `self` runs. Calls in Closed hold no probe slot.
    const renewingProbeLease = (permit: Permit) => <A, E2, R>(self: Effect.Effect<A, E2, R>) =>
      permit.probeId === undefined ? self : Effect.flatMap(
        store.renewProbeLease({ key: options.key, permit }).pipe(
          Effect.catchCause((cause) => diagnostic("renew_probe_lease", cause)),
          Effect.interruptible,
          Effect.forkChild
        ),
        (renewal) => Effect.ensuring(self, Fiber.interrupt(renewal))
      )

    const execute: CircuitBreaker<E>["execute"] = (effect, executeOptions) =>
      // Once a permit is granted, `record` must run so a probe slot is never leaked;
      // only waiting and the user's effect are interruptible.
      Effect.uninterruptibleMask((restore) =>
        Effect.gen(function*() {
          const acquired = executeOptions?.onRejected === "wait"
            ? yield* acquireWaiting(acquire, pubsub, restore)
            : yield* acquire
          if (acquired._tag === "Rejected") return yield* rejected(acquired)
          // Open -> HalfOpen happens lazily inside `acquire`, so it is published here.
          yield* publishTransition(acquired.transition)
          return yield* restore(effect).pipe(
            renewingProbeLease(acquired.permit),
            Effect.onExit((exit) => record(acquired.permit, exit))
          )
        })
      )

    return identity<CircuitBreaker<E>>({
      [TypeId]: TypeId,
      key: options.key,
      execute,
      state: store.state(options.key),
      transitions: Stream.fromPubSub(pubsub)
    })
  }
)

/**
 * Runs `effect` through `breaker`.
 *
 * **Details**
 *
 * Set `onRejected: "wait"` for background workers. Wrap the work, not the
 * blocking wait for work:
 * `queue.take((job) => breaker.execute(process(job), { onRejected: "wait" }))`.
 * Workers hold claimed jobs while waiting without failing them. Half-open
 * polling backs off from 100 ms to 5 seconds; local transitions wake waiters
 * immediately. Defaults to `"fail"`; store failures fail in either mode.
 *
 * **Gotchas**
 *
 * Keep queue takes, stream pulls and waits for external signals outside
 * `execute`: a permit belongs to the generation at acquisition time and can
 * become stale while idle. Long job holds must respect the queue's lock
 * renewal or visibility rules. `PersistedQueue` counts an attempt on claim,
 * renews Redis locks during the handler and reverses that increment on pure
 * interruption. Expired Redis locks allow redelivery.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const execute: {
  <E>(
    breaker: CircuitBreaker<E>,
    options?: ExecuteOptions | undefined
  ): <A, E2 extends E, R>(effect: Effect.Effect<A, E2, R>) => Effect.Effect<A, E2 | CircuitBreakerError, R>
  <A, E2 extends E, R, E>(
    effect: Effect.Effect<A, E2, R>,
    breaker: CircuitBreaker<E>,
    options?: ExecuteOptions | undefined
  ): Effect.Effect<A, E2 | CircuitBreakerError, R>
} = dual(
  (args) => Effect.isEffect(args[0]),
  <A, E2 extends E, R, E>(
    effect: Effect.Effect<A, E2, R>,
    breaker: CircuitBreaker<E>,
    options?: ExecuteOptions | undefined
  ): Effect.Effect<A, E2 | CircuitBreakerError, R> => breaker.execute(effect, options)
)

/**
 * Provides a process-local in-memory `CircuitBreakerStore`.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerStoreMemory: Layer.Layer<CircuitBreakerStore> = Layer.sync(CircuitBreakerStore, makeMemoryStore)

/**
 * Creates a Redis-backed `CircuitBreakerStore`.
 *
 * **Details**
 *
 * Every operation runs as a single Lua script, so state is shared atomically
 * across processes. Half-open probes hold a lease of `probeLease` (default 1
 * minute) that is renewed while the probe runs, so a probe slot held by a
 * crashed process is released once its lease expires.
 *
 * At most `halfOpen.permits` probes run concurrently as long as holders do not
 * pause longer than the probe lease and process clocks are reasonably in sync.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeStoreRedis = Effect.fnUntraced(function*(
  options?: {
    readonly prefix?: string | undefined
    readonly probeLease?: Duration.Input | undefined
  }
) {
  return makeRedisStore({
    redis: yield* Redis.Redis,
    prefix: options?.prefix ?? "circuitbreaker:",
    probeLeaseMillis: Duration.toMillis(Duration.fromInputUnsafe(options?.probeLease ?? "1 minute")),
    storeError: (message, cause) =>
      new CircuitBreakerError({ reason: new CircuitBreakerStoreError({ message, cause }) })
  })
})

/**
 * Provides a Redis-backed `CircuitBreakerStore` using `makeStoreRedis`.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerStoreRedis: (
  options?: {
    readonly prefix?: string | undefined
    readonly probeLease?: Duration.Input | undefined
  }
) => Layer.Layer<CircuitBreakerStore, never, Redis.Redis> = flow(makeStoreRedis, Layer.effect(CircuitBreakerStore))

/**
 * Provides a Redis-backed `CircuitBreakerStore` from wrapped configuration
 * options.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerStoreRedisConfig = (
  options: Config.Wrap<{
    readonly prefix?: string | undefined
    readonly probeLease?: Duration.Input | undefined
  }>
): Layer.Layer<CircuitBreakerStore, Config.ConfigError, Redis.Redis> =>
  Layer.effect(
    CircuitBreakerStore,
    Effect.flatMap(Config.unwrap(options), makeStoreRedis)
  )
