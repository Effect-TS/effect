/**
 * `Data` represents the state of the `TestClock`, including the clock time
 * and time zone.
 *
 * @tsplus type effect/core/testing/TestClock.Data
 */
export interface Data {
  readonly instant: number
  readonly sleeps: List<Tuple<[number, Deferred<never, void>]>>
}

/**
 * @tsplus type effect/core/testing/TestClock.Data.Ops
 */
export interface DataOps {
  (
    instant: number,
    sleeps: List<Tuple<[number, Deferred<never, void>]>>
  ): Data
}
/**
 * @tsplus static effect/core/testing/TestClock.Ops Data
 */
export const Data: DataOps = (instant, sleeps) => ({
  instant,
  sleeps
})
