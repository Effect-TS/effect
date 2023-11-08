/**
 * @since 2.0.0
 */
import type { Context } from "./Context.js"
import type { Duration } from "./Duration.js"
import type { Effect } from "./Effect.js"
import * as internal from "./internal/clock.js"
import * as defaultServices from "./internal/defaultServices.js"

import type { Clock } from "./Clock.js"

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
