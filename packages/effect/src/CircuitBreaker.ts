/**
 * @since 3.3.0
 */
import type { DurationInput } from "./Duration.js"
import type { Effect } from "./Effect.js"
import * as InternalCircuitBreaker from "./internal/circuitBreaker.js"
import type { MetricLabel } from "./MetricLabel.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate } from "./Predicate.js"
import type { Dequeue } from "./Queue.js"
import type { Schedule } from "./Schedule.js"
import type { Scope } from "./Scope.js"
import type { Invariant } from "./Types.js"

/**
 * @since 3.3.0
 * @category symbols
 */
export const CircuitBreakerTypeId: unique symbol = InternalCircuitBreaker.CircuitBreakerTypeId

/**
 * @since 3.3.0
 * @category symbols
 */
export type CircuitBreakerTypeId = typeof CircuitBreakerTypeId

export interface CircuitBreaker<in out E = never> extends CircuitBreaker.Variance<E>, Pipeable {
  /**
   * Executes the specified effect with the circuit breaker. Returns an effect
   * that either succeeds with the value of the input effect, or fails with
   * either a `CircuitBreaker.OpenError` or a `CircuitBreaker.WrappedError`
   * which contains the error of the input effect.
   */
  <A, R>(effect: Effect<A, E, R>): Effect<A, CircuitBreaker.Error<E>, R>
  /**
   * Returns the current state of the `CircuitBreaker`.
   */
  readonly currentState: Effect<CircuitBreaker.State>
  /**
   * Returns a `Stream` of the `CircuitBreaker`'s state changes.
   */
  readonly stateChanges: Effect<Dequeue<CircuitBreaker.StateChange>, never, Scope>
}

export declare namespace CircuitBreaker {
  export interface Variance<E> {
    readonly [CircuitBreakerTypeId]: {
      readonly _Error: Invariant<E>
    }
  }

  export type State = "Open" | "Closed" | "HalfOpen"

  export interface StateChange {
    readonly from: State
    readonly to: State
    readonly at: BigInt
  }

  export interface TrippingStrategy {
    readonly onReset: Effect<void>
    /**
     * Invoked for every successful or failed call of the `CircuitBreaker`.
     *
     * @return Whether or not the `CircuitBreaker` should trip due to too many
     * failures.
     */
    shouldTrip(successful: boolean): Effect<boolean>
  }

  /**
   * Represents the set of common options which can be used to construct a
   * `CircuitBreaker`.
   *
   * @since 3.3.0
   * @category models
   */
  export interface CommonOptions<E> {
    /**
     * The `Schedule` which is used to reset the `CircuitBreaker` after too many
     * failures have occurred. Typically an exponential backoff strategy is
     * used.
     */
    readonly resetPolicy?: Schedule<any, any, any> | undefined
    /**
     * Only failures that match according to `isFailure` are treated as failures
     * by the `CircuitBreaker`. Other failures are passed on, circumventing the
     * `CircuitBreakers`'s failure counter.
     */
    readonly isFailure?: Predicate<E> | undefined
    /**
     * A set of labels to annotate metrics with, to distinguish this
     * `CircuitBreaker` from others in the same application. No metrics are
     * recorded if `Option.None` is passed.
     */
    readonly metricLabels?: Iterable<MetricLabel> | undefined
  }

  /**
   * Represents the set of options which can be used to construct a
   * `CircuitBreaker`.
   *
   * @since 3.3.0
   * @category models
   */
  export interface MakeOptions<E> extends CommonOptions<E> {
    /**
     * Determines the conditions under which the `CircuitBreaker` will "trip".
     */
    readonly strategy: Effect<TrippingStrategy, never, Scope>
  }

  /**
   * Represents options for a `CircuitBreaker` that fails when the fraction of
   * failures in a sample period exceeds some threshold.
   *
   * The sample interval is divided into a number of buckets, which are rotated
   * periodically (`sampleDuration / sampleBuckets`) to achieve a moving average
   * of the failure rate.
   *
   * @since 3.3.0
   * @category models
   */
  export interface FailureRateOptions<E> extends CommonOptions<E> {
    /**
     * The minimum number of calls required within the sample period to
     * evaluate the actual failure rate.
     */
    readonly minThroughput?: number | undefined
    /**
     * The number of intervals to divide the sample duration into.
     */
    readonly sampleBuckets?: number | undefined
    /**
     * The minimum amount of time to record calls.
     */
    readonly sampleDuration?: DurationInput | undefined
    /**
     * The minimum fraction (between `0.0` and `1.0`) of calls that must fail
     * within the sample duration for the `CircuitBreaker` to "trip".
     */
    readonly threshold?: number | undefined
  }

  /**
   * Represents the set of options which can be used to construct a
   * `CircuitBreaker` using the maximum failures tripping strategy.
   *
   * @since 3.3.0
   * @category models
   */
  export interface MaxFailuresOptions<E> extends CommonOptions<E> {
    /**
     * The maximum number of failures that can occur before the `CircuitBreaker`
     * "trips".
     */
    readonly maxFailures: number
  }

  export type Error<E> = OpenError | WrappedError<E>

  export interface OpenError {
    readonly _tag: "OpenError"
  }

  export interface WrappedError<E> {
    readonly _tag: "WrappedError"
    readonly error: E
  }
}

export const make: <E>(
  options: CircuitBreaker.MakeOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.make

export const withFailureRate: <E>(
  options: CircuitBreaker.FailureRateOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.withFailureRate

export const withMaxFailures: <E>(
  options: CircuitBreaker.MaxFailuresOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.withMaxFailures
