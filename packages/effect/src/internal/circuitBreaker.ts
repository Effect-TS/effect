import * as Array from "../Array.js"
import * as Cause from "../Cause.js"
import type * as CircuitBreaker from "../CircuitBreaker.js"
import * as Clock from "../Clock.js"
import * as Duration from "../Duration.js"
import * as Effect from "../Effect.js"
import { constFalse, constTrue } from "../Function.js"
import * as Metric from "../Metric.js"
import type * as MetricLabel from "../MetricLabel.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Predicate from "../Predicate.js"
import * as PubSub from "../PubSub.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import * as Schedule from "../Schedule.js"
import type * as Scope from "../Scope.js"
import * as Stream from "../Stream.js"
import * as Unify from "../Unify.js"

/** @internal */
const CircuitBreakerSymbolKey = "effect/CircuitBreaker"

/** @internal */
export const CircuitBreakerTypeId: CircuitBreaker.CircuitBreakerTypeId = Symbol.for(
  CircuitBreakerSymbolKey
) as CircuitBreaker.CircuitBreakerTypeId

const circuitBreakerVariance = {
  /* c8 ignore next */
  _Error: (_: unknown) => _
}

class StateChange implements CircuitBreaker.CircuitBreaker.StateChange {
  constructor(
    readonly from: CircuitBreaker.CircuitBreaker.State,
    readonly to: CircuitBreaker.CircuitBreaker.State,
    readonly atNanos: BigInt
  ) {}
}

class CircuitBreakerMetrics {
  constructor(
    readonly state: Metric.Metric.Gauge<number>,
    readonly stateChanges: Metric.Metric.Counter<number>,
    readonly successfulCalls: Metric.Metric.Counter<number>,
    readonly failedCalls: Metric.Metric.Counter<number>,
    readonly rejectedCalls: Metric.Metric.Counter<number>
  ) {}
}

/** @internal */
export const OpenError: CircuitBreaker.CircuitBreaker.OpenError = {
  _tag: "OpenError"
}

const exponentialBackoff = Schedule.exponential("1 second", 2).pipe(
  Schedule.whileOutput(Duration.lessThan("1 minute")),
  Schedule.andThen(Schedule.fixed("1 minute")),
  Schedule.as(Duration.minutes(1))
)

/** @internal */
export const withFailureRate = <E>({
  isFailure = constTrue,
  metricLabels = undefined,
  resetPolicy = exponentialBackoff,
  ...rest
}: CircuitBreaker.CircuitBreaker.FailureRateOptions<E>) =>
  make({
    strategy: failureRate(rest),
    isFailure,
    metricLabels,
    resetPolicy
  })

/** @internal */
export const withMaxFailures = <E>({
  isFailure = constTrue,
  maxFailures,
  resetPolicy = exponentialBackoff,
  ...rest
}: CircuitBreaker.CircuitBreaker.MaxFailuresOptions<E>) =>
  make({
    strategy: failureCount(maxFailures),
    resetPolicy,
    isFailure,
    ...rest
  })

/** @internal */
export const make = <E>({
  isFailure = constTrue,
  metricLabels = undefined,
  resetPolicy = exponentialBackoff,
  strategy: trippingStrategy
}: CircuitBreaker.CircuitBreaker.MakeOptions<E>): Effect.Effect<
  CircuitBreaker.CircuitBreaker<E>,
  never,
  Scope.Scope
> =>
  Effect.gen(function*() {
    const strategy = yield* trippingStrategy
    const state = yield* Ref.make<CircuitBreaker.CircuitBreaker.State>("Closed")
    const halfOpenSwitch = yield* Ref.make<boolean>(true)
    const schedule = yield* Schedule.driver(resetPolicy)
    const resetRequests = yield* Queue.bounded<void>(1)
    const stateChanges = yield* Effect.acquireRelease(
      PubSub.sliding<CircuitBreaker.CircuitBreaker.StateChange>(32),
      (pubsub) => PubSub.shutdown(pubsub)
    )

    const metrics = Option.fromNullable(metricLabels).pipe(
      Option.map(makeMetrics)
    )

    function withMetrics(f: (metrics: CircuitBreakerMetrics) => Effect.Effect<void>): Effect.Effect<void> {
      return Effect.ignore(Effect.flatMap(metrics, f))
    }

    const changeToOpen = Ref.getAndSet(state, "Open").pipe(
      Effect.zipLeft(Queue.offer(resetRequests, void 0)),
      Effect.flatMap((oldState) =>
        Effect.flatMap(Clock.currentTimeNanos, (now) =>
          PubSub.publish(
            stateChanges,
            new StateChange(oldState, "Open", now)
          ))
      ),
      Effect.asVoid
    )

    const changeToClosed = strategy.onReset.pipe(
      Effect.zipRight(schedule.reset),
      Effect.zipRight(Clock.currentTimeNanos),
      Effect.flatMap((now) =>
        Effect.flatMap(Ref.getAndSet(state, "Closed"), (oldState) =>
          PubSub.publish(
            stateChanges,
            new StateChange(oldState, "Closed", now)
          ))
      ),
      Effect.asVoid
    )

    const resetProcess = Stream.fromQueue(resetRequests).pipe(
      Stream.mapEffect(() =>
        schedule.next(void 0).pipe(
          Effect.zipRight(Ref.set(halfOpenSwitch, true)),
          Effect.zipRight(Ref.set(state, "HalfOpen")),
          Effect.zipRight(Clock.currentTimeNanos),
          Effect.flatMap((now) =>
            PubSub.publish(
              stateChanges,
              new StateChange("Open", "HalfOpen", now)
            )
          )
        )
      ),
      Stream.runDrain,
      Effect.forkScoped,
      Effect.asVoid
    )

    const trackStateChanges = PubSub.subscribe(stateChanges).pipe(
      Effect.flatMap((changes) =>
        Stream.fromQueue(changes).pipe(
          Stream.tap((stateChange) => {
            const state = stateToCode(stateChange.to)
            return withMetrics((metrics) =>
              Metric.increment(metrics.stateChanges).pipe(
                Effect.zipRight(Metric.set(metrics.state, state))
              )
            )
          }),
          Stream.runDrain,
          Effect.forkScoped
        )
      ),
      Effect.asVoid
    )

    function tapUserError<A, E2 extends E, R, XF, XS>(effect: Effect.Effect<A, E2, R>, options: {
      readonly onFailure: Effect.Effect<XF, E2, R>
      readonly onSuccess: Effect.Effect<XS, E2, R>
    }): Effect.Effect<A, E2, R> {
      return Effect.tapBoth(effect, {
        onFailure: (e) =>
          Unify.unify(
            isFailure(e)
              ? options.onFailure
              : options.onSuccess
          ),
        onSuccess: () => options.onSuccess
      })
    }

    const circuitBreaker: CircuitBreaker.CircuitBreaker<E> = Object.assign(
      <A, E2 extends E, R>(
        effect: Effect.Effect<A, E2, R>
      ): Effect.Effect<A, E2 | CircuitBreaker.CircuitBreaker.OpenError, R> =>
        Ref.get(state).pipe(
          Effect.flatMap((currentState) => {
            switch (currentState) {
              case "Open": {
                return Effect.fail(OpenError)
              }
              case "Closed": {
                // The state may have already changed to `Open` or even `HalfOpen` -
                // this can happen if we fire `n` calls in parallel where
                // `n >= 2 * maxFailures`
                const onComplete = (successful: boolean) =>
                  strategy.shouldTrip(successful).pipe(
                    Effect.zip(Ref.get(state)),
                    Effect.flatMap(([shouldTrip, currentState]) =>
                      changeToOpen.pipe(
                        Effect.when(() => currentState === "Closed" && shouldTrip)
                      )
                    ),
                    Effect.asVoid,
                    Effect.uninterruptible
                  )
                return tapUserError(effect, {
                  onFailure: onComplete(false),
                  onSuccess: onComplete(true)
                })
              }
              case "HalfOpen": {
                return Ref.getAndUpdate(halfOpenSwitch, constFalse).pipe(
                  Effect.flatMap((isFirstCall) =>
                    Unify.unify(
                      isFirstCall
                        ? tapUserError(effect, {
                          onFailure: strategy.shouldTrip(false).pipe(
                            Effect.zipRight(changeToOpen),
                            Effect.uninterruptible
                          ),
                          onSuccess: changeToClosed.pipe(
                            Effect.zipRight(strategy.onReset),
                            Effect.uninterruptible
                          )
                        })
                        : Effect.fail(OpenError)
                    )
                  )
                )
              }
            }
          }),
          Effect.tapBoth({
            onFailure: (error) =>
              Predicate.isTagged(error, "OpenError")
                ? withMetrics((metrics) => Metric.increment(metrics.rejectedCalls))
                : withMetrics((metrics) => Metric.increment(metrics.failedCalls)),
            onSuccess: () => withMetrics((metrics) => Metric.increment(metrics.successfulCalls))
          })
        ),
      {
        [CircuitBreakerTypeId]: circuitBreakerVariance,
        currentState: Ref.get(state),
        stateChanges: PubSub.subscribe(stateChanges),
        pipe() {
          return pipeArguments(this, arguments)
        }
      }
    )

    yield* resetProcess
    yield* trackStateChanges

    return circuitBreaker
  })

// =============================================================================
// Metrics
// =============================================================================

const stateToCode = (state: CircuitBreaker.CircuitBreaker.State): number => {
  switch (state) {
    case "Closed": {
      return 0
    }
    case "HalfOpen": {
      return 1
    }
    case "Open": {
      return 2
    }
  }
}

const makeMetrics = (labels: Iterable<MetricLabel.MetricLabel>) => {
  const state = Metric.gauge("effect_circuit_breaker_state").pipe(
    Metric.taggedWithLabels(labels)
  )
  const stateChanges = Metric.counter("effect_circuit_breaker_state_changes").pipe(
    Metric.taggedWithLabels(labels)
  )
  const successfulCalls = Metric.counter("effect_circuit_breaker_successful_calls").pipe(
    Metric.taggedWithLabels(labels)
  )
  const failedCalls = Metric.counter("effect_circuit_breaker_failed_calls").pipe(
    Metric.taggedWithLabels(labels)
  )
  const rejectedCalls = Metric.counter("effect_circuit_breaker_rejected_calls").pipe(
    Metric.taggedWithLabels(labels)
  )
  return new CircuitBreakerMetrics(
    state,
    stateChanges,
    successfulCalls,
    failedCalls,
    rejectedCalls
  )
}

// =============================================================================
// Tripping Strategies
// =============================================================================

const failureCount = (
  maxFailures: number
): Effect.Effect<CircuitBreaker.CircuitBreaker.TrippingStrategy, never, Scope.Scope> =>
  Ref.make(0).pipe(Effect.map((ref) => ({
    shouldTrip: (successful: boolean) =>
      successful
        ? Ref.set(ref, 0).pipe(Effect.as(false))
        : Ref.modify(ref, (n) => [n + 1 === maxFailures, n + 1]),
    onReset: Ref.set(ref, 0)
  })))

interface Bucket {
  readonly successes: number
  readonly failures: number
}

const emptyBucket: Bucket = { successes: 0, failures: 0 }

const failureRate = ({
  minThroughput = 10,
  sampleBuckets = 10,
  sampleDuration = "1 minutes",
  threshold = 0.5
}: CircuitBreaker.CircuitBreaker.FailureRateOptions<never>): Effect.Effect<
  CircuitBreaker.CircuitBreaker.TrippingStrategy,
  never,
  Scope.Scope
> =>
  Effect.gen(function*() {
    // Perform some basic validation
    if (threshold < 0 || threshold > 1) {
      return yield* Effect.dieMessage("threshold must be between 0 (exclusive) and 1")
    }
    if (sampleBuckets < 0) {
      return yield* Effect.dieMessage("sampleBuckets must be larger than 0")
    }
    if (minThroughput < 0) {
      return yield* Effect.dieMessage("minThroughput must be larger than 0")
    }

    // Calculate the rotation interval
    const rotationInterval = Duration.decode(sampleDuration).pipe(Duration.times(1 / sampleBuckets))

    // Create a ref to hold the samples
    const samplesRef = yield* Ref.make<ReadonlyArray<Bucket>>(Array.of({
      successes: 0,
      failures: 0
    }))

    // Rotate the buckets periodically
    yield* Ref.updateAndGet(samplesRef, (samples) =>
      samples.length < sampleBuckets
        ? Array.prepend(samples, emptyBucket)
        : Array.prepend(Array.dropRight(samples, 1), emptyBucket)).pipe(
        Effect.repeat(Schedule.fixed(rotationInterval)),
        Effect.delay(rotationInterval),
        Effect.forkScoped
      )

    function updateSamples(samples: ReadonlyArray<Bucket>, successful: boolean): ReadonlyArray<Bucket> {
      return Array.matchLeft(samples, {
        onEmpty: () => {
          throw new Cause.IllegalArgumentException("The samples array should not be empty")
        },
        onNonEmpty: (bucket, remainingSamples) => {
          const updatedBucket: Bucket = successful
            ? { ...bucket, successes: bucket.successes + 1 }
            : { ...bucket, failures: bucket.failures + 1 }
          return Array.prepend(remainingSamples, updatedBucket)
        }
      })
    }

    function shouldTrip(samples: ReadonlyArray<Bucket>): boolean {
      const total = Array.reduce(samples, 0, (sum, bucket) => sum + bucket.successes + bucket.failures)
      const minThroughputMet = total >= minThroughput
      const minSamplePeriod = samples.length === sampleBuckets
      const currentFailureRate = total > 0
        ? Array.reduce(samples, 0, (sum, bucket) => sum + bucket.failures) / total
        : 0
      return minThroughputMet && minSamplePeriod && (currentFailureRate >= threshold)
    }

    return {
      shouldTrip: (successful) =>
        Ref.modify(samplesRef, (oldSamples) => {
          const samples = updateSamples(oldSamples, successful)
          return [shouldTrip(samples), samples]
        }),
      onReset: Ref.set(samplesRef, Array.of(emptyBucket))
    }
  })
