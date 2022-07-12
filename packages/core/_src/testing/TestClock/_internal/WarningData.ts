/**
 * @tsplus type effect/core/testing/TestClock.WarningData
 */
export type WarningData = Start | Pending | Done

/**
 * `WarningData` describes the state of the warning message that is displayed
 * if a test is using time by is not advancing the `TestClock`. The possible
 * states are `Start` if a test has not used time, `Pending` if a test has
 * used time but has not adjusted the `TestClock`, and `Done` if a test has
 * adjusted the `TestClock` or the warning message has already been displayed.
 *
 * @tsplus type effect/core/testing/TestClock.WarningData.Ops
 */
export interface WarningDataOps {}
export const WarningData: WarningDataOps = {}

export interface Start {
  readonly _tag: "Start"
}

export interface Pending {
  readonly _tag: "Pending"
  readonly fiber: Fiber<Error, void>
}

export interface Done {
  readonly _tag: "Done"
}

/**
 * SState indicating that a test has not used time.
 *
 * @tsplus static effect/core/testing/TestClock.WarningData.Ops Start
 */
export const start: WarningData = {
  _tag: "Start"
}

/**
 * State indicating that a test has used time but has not adjusted the
 * `TestClock` with a reference to the fiber that will display the warning
 * message.
 *
 * @tsplus static effect/core/testing/TestClock.WarningData.Ops Pending
 */
export function pending(fiber: Fiber<Error, void>): WarningData {
  return {
    _tag: "Pending",
    fiber
  }
}

/**
 * State indicating that a test has used time or the warning message has
 * already been displayed.
 *
 * @tsplus static effect/core/testing/TestClock.WarningData.Ops Done
 */
export const done: WarningData = {
  _tag: "Done"
}
