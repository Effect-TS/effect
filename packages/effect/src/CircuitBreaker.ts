/**
 * A `CircuitBreaker` protects external resources against becoming overload
 * under failure conditions.
 *
 * A `CircuitBreaker` operates in three states:
 *
 *   - `Closed` (initial state / normal operation): calls are let through
 *     normally. Call failures and successes update call statistics (eg failure
 *     count). When the call statistics satisfy the criteria of the provided
 *     `TrippingStrategy`, the circuit breaker is "tripped" and set to the
 *     `Open` state. Note that after this switch, any in-flight calls are *not*
 *     cancelled and their success or failure will no longer affect the state of
 *     the `CircuitBreaker`.
 *
 *   - `Open`: all calls fail fast with an `CircuitBreaker.OpenError`. After the
 *     reset timeout, the state will transition to `HalfOpen`.
 *
 *   - `HalfOpen`: the first call is let through. Meanwhile all other calls fail
 *     with a `CircuitBreaker.OpenError` error. If the first call succeeds, the
 *     state transitions to `Closed` again (normal operation). If it fails, the
 *     state transitions back to `Open`. The reset timeout is governed by a
 *     reset policy, which is typically an exponential backoff.
 *
 * Two tripping strategies are available:
 *
 *   1. Max Failure Count
 *
 *      When the number of successive failures exceeds a threshold, the
 *      `CircuitBreaker` is "tripped".
 *
 *      **Note**: the maximum number of failures before tripping the
 *      `CircuitBreaker` is not absolute under concurrent execution. For
 *      example, consider a scenario where you make `20` calls to a failing
 *      system concurrently via a `CircuitBreaker` with it's max failure count
 *      set to `10` failures. The circuit breaker will trip after `10` calls,
 *      but the remaining `10` that are in-flight will continue to run and fail
 *      as well.
 *
 *   2. Max Failure Rate
 *
 *      When the fraction of failed calls in the specified sample period exceeds
 *      the defined threshold (between `0` and `1`), the `CircuitBreaker` is
 *      tripped. The decision to trip the `CircuitBreaker` is made after each
 *      call, including successful ones.
 *
 * The `CircuitBreaker` will also record the following metrics, if a non-empty
 * iterable of `MetricLabel`s is provided:
 *
 *   - effect_circuit_breaker_state: current state (`0` = `Closed`, `1` =
 *     `HalfOpen`, `2` = `Open`)
 *   - effect_circuit_breaker_state_changes: number of state changes
 *   - effect_circuit_breaker_successful_calls: number of successful calls
 *   - effect_circuit_breaker_failed_calls: number of failed calls
 *   - effect_circuit_breaker_rejected_calls: number of calls rejected in the
 *     open state
 *
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
import type { Contravariant } from "./Types.js"

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

/**
 * Represents a `CircuitBreaker`.
 *
 * @since 3.3.0
 * @category models
 */
export interface CircuitBreaker<in E = unknown> extends CircuitBreaker.Variance<E>, Pipeable {
  /**
   * Executes the specified effect with the circuit breaker. Returns an effect
   * that either succeeds with the value of the input effect, or fails with
   * either a `CircuitBreaker.OpenError` or the error of the input effect.
   */
  <A, E2 extends E, R>(effect: Effect<A, E2, R>): Effect<A, E2 | CircuitBreaker.OpenError, R>
  /**
   * Returns the current state of the `CircuitBreaker`.
   */
  readonly currentState: Effect<CircuitBreaker.State>
  /**
   * Returns a `Stream` of the `CircuitBreaker`'s state changes.
   */
  readonly stateChanges: Effect<Dequeue<CircuitBreaker.StateChange>, never, Scope>
}

/**
 * @since 3.3.0
 */
export declare namespace CircuitBreaker {
  /**
   * @since 3.3.0
   * @category models
   */
  export interface Variance<in E> {
    readonly [CircuitBreakerTypeId]: {
      readonly _Error: Contravariant<E>
    }
  }

  /**
   * @since 3.3.0
   * @category models
   */
  export interface OpenError {
    readonly _tag: "OpenError"
  }

  /**
   * @since 3.3.0
   * @category models
   */
  export type State = "Open" | "Closed" | "HalfOpen"

  /**
   * @since 3.3.0
   * @category models
   */
  export interface StateChange {
    readonly from: State
    readonly to: State
    readonly atNanos: BigInt
  }

  /**
   * @since 3.3.0
   * @category models
   */
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
  export interface CommonOptions<E = unknown> {
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
  export interface MakeOptions<E = unknown> extends CommonOptions<E> {
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
  export interface FailureRateOptions<E = unknown> extends CommonOptions<E> {
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
  export interface MaxFailuresOptions<E = unknown> extends CommonOptions<E> {
    /**
     * The maximum number of failures that can occur before the `CircuitBreaker`
     * "trips".
     */
    readonly maxFailures: number
  }
}

/**
 * Represents the error that will be returned by calls to a `CircuitBreaker` in
 * the `Open` state.
 *
 * @since 3.3.0
 * @category constructors
 */
export const OpenError: CircuitBreaker.OpenError = InternalCircuitBreaker.OpenError

/**
 * Creates a `CircuitBreaker` with the specified `TrippingStrategy`, which is
 * used to determine under which conditions the `CircuitBreaker` should "trip".
 *
 * @since 3.3.0
 * @category constructors
 */
export const make: <E>(
  options: CircuitBreaker.MakeOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.make

/**
 * Creates a `CircuitBreaker` that fails when the fraction of failures in the
 * specified sample period exceeds the given threshold.
 *
 * The sample interval is divided into a number of buckets, which are rotated
 * periodically (`sampleDuration / sampleBuckets)` to achieve a moving average \
 * of the failure rate.
 *
 * @since 3.3.0
 * @category constructors
 */
export const withFailureRate: <E>(
  options: CircuitBreaker.FailureRateOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.withFailureRate

/**
 * Creates a `CircuitBreaker` that fails when the number of successive failed
 * calls seen by the circuit breaker exceeds the specified maximum.
 *
 * @since 3.3.0
 * @category constructors
 */
export const withMaxFailures: <E>(
  options: CircuitBreaker.MaxFailuresOptions<E>
) => Effect<CircuitBreaker<E>, never, Scope> = InternalCircuitBreaker.withMaxFailures
