import type { Interval } from "@effect/core/io/Schedule/Interval"
import { Intervals } from "@effect/core/io/Schedule/Intervals"

/**
 * @tsplus type effect/core/io/Schedule/Decision
 */
export type Decision = Continue | Done

export interface Continue {
  readonly _tag: "Continue"
  readonly intervals: Intervals
}

export interface Done {
  readonly _tag: "Done"
}

/**
 * @tsplus type effect/core/io/Schedule/Decision.Ops
 */
export interface DecisionOps {}
export const Decision: DecisionOps = {}

/**
 * @tsplus static effect/core/io/Schedule/Decision.Ops Continue
 */
export function _continue(intervals: Intervals): Decision {
  return {
    _tag: "Continue",
    intervals
  }
}

export { _continue as continue }

/**
 * @tsplus static effect/core/io/Schedule/Decision.Ops continueWith
 */
export function continueWith(interval: Interval): Decision {
  return {
    _tag: "Continue",
    intervals: Intervals(List(interval))
  }
}

/**
 * @tsplus static effect/core/io/Schedule/Decision.Ops Done
 */
export const done: Decision = {
  _tag: "Done"
}
