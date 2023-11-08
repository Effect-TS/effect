/**
 * @since 2.0.0
 */
import type { Context } from "./Context.js"
import type { Duration } from "./Duration.js"
import type { Effect } from "./Effect.js"
import * as internal from "./internal/clock.js"
import * as defaultServices from "./internal/defaultServices.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ClockTypeId: unique symbol = internal.ClockTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ClockTypeId = typeof ClockTypeId

export * as Clock from "./Clock.js"

declare module "./Clock.js" {
  /**
   * Represents a time-based clock which provides functionality related to time
   * and scheduling.
   *
   * @since 2.0.0
   * @category models
   */
  export interface Clock {
    readonly [ClockTypeId]: ClockTypeId
    /**
     * Unsafely returns the current time in milliseconds.
     */
    unsafeCurrentTimeMillis(): number
    /**
     * Returns the current time in milliseconds.
     */
    readonly currentTimeMillis: Effect<never, never, number>
    /**
     * Unsafely returns the current time in nanoseconds.
     */
    unsafeCurrentTimeNanos(): bigint
    /**
     * Returns the current time in nanoseconds.
     */
    readonly currentTimeNanos: Effect<never, never, bigint>
    /**
     * Asynchronously sleeps for the specified duration.
     */
    sleep(duration: Duration): Effect<never, never, void>
  }
}

/**
 * @since 2.0.0
 * @category models
 */
export type CancelToken = () => boolean

/**
 * @since 2.0.0
 * @category models
 */
export type Task = () => void

/**
 * @since 2.0.0
 * @category models
 */
export interface ClockScheduler {
  /**
   * Unsafely schedules the specified task for the specified duration.
   */
  readonly unsafeSchedule: (task: Task, duration: Duration) => CancelToken
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (_: void) => Clock = internal.make

/**
 * @since 2.0.0
 * @category constructors
 */
export const sleep: (duration: Duration.DurationInput) => Effect<never, never, void> = defaultServices.sleep

/**
 * @since 2.0.0
 * @category constructors
 */
export const currentTimeMillis: Effect<never, never, number> = defaultServices.currentTimeMillis

/**
 * @since 2.0.0
 * @category constructors
 */
export const currentTimeNanos: Effect<never, never, bigint> = defaultServices.currentTimeNanos

/**
 * @since 2.0.0
 * @category constructors
 */
export const clockWith: <R, E, A>(f: (clock: Clock) => Effect<R, E, A>) => Effect<R, E, A> = defaultServices.clockWith

/**
 * @since 2.0.0
 * @category context
 */
export const Tag: Context.Tag<Clock, Clock> = internal.clockTag
