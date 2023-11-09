import type { ClockTypeId } from "../Clock.js"
import type { Duration } from "./Duration.js"
import type { Effect } from "./Effect.js"

export * from "../Clock.js"
export * from "../internal/Jumpers/Clock.js"

export declare namespace Clock {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Clock.js"
}
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
