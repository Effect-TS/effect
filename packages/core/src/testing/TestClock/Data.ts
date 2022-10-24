import type { List } from "@fp-ts/data/List"

/**
 * `Data` represents the state of the `TestClock`, including the clock time
 * and time zone.
 *
 * @tsplus type effect/core/testing/TestClock.Data
 * @category model
 * @since 1.0.0
 */
export interface Data {
  readonly instant: number
  readonly sleeps: List<readonly [number, Deferred<never, void>]>
}

/**
 * @tsplus type effect/core/testing/TestClock.Data.Ops
 * @category model
 * @since 1.0.0
 */
export interface DataOps {
  (
    instant: number,
    sleeps: List<readonly [number, Deferred<never, void>]>
  ): Data
}

/**
 * @tsplus static effect/core/testing/TestClock.Ops Data
 * @category constructors
 * @since 1.0.0
 */
export const Data: DataOps = (instant, sleeps) => ({
  instant,
  sleeps
})
