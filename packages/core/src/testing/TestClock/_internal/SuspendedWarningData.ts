/**
 * @tsplus type effect/core/testing/TestClock.SuspendedWarningData
 * @internal
 */
export type SuspendedWarningData = Start | Pending | Done

/**
 * @tsplus type effect/core/testing/TestClock.SuspendedWarningData.Ops
 * @internal
 */
export interface SuspendedWarningDataOps {}

/** @internal */
export const SuspendedWarningData: SuspendedWarningDataOps = {}

/** @internal */
export interface Start {
  readonly _tag: "Start"
}

/** @internal */
export interface Pending {
  readonly _tag: "Pending"
  readonly fiber: Fiber<Error, void>
}

/** @internal */
export interface Done {
  readonly _tag: "Done"
}

/**
 * State indicating that a test has not adjusted the clock.
 *
 * @tsplus static effect/core/testing/TestClock.SuspendedWarningData.Ops Start
 * @internal
 */
export const start: SuspendedWarningData = {
  _tag: "Start"
}

/**
 * State indicating that a test has adjusted the clock but a fiber is still
 * running with a reference to the fiber that will display the warning
 * message.
 *
 * @tsplus static effect/core/testing/TestClock.SuspendedWarningData.Ops Pending
 * @internal
 */
export function pending(fiber: Fiber<Error, void>): SuspendedWarningData {
  return {
    _tag: "Pending",
    fiber
  }
}

/**
 * State indicating that the warning message has already been displayed.
 *
 * @tsplus static effect/core/testing/TestClock.SuspendedWarningData.Ops Done
 * @internal
 */
export const done: SuspendedWarningData = {
  _tag: "Done"
}
