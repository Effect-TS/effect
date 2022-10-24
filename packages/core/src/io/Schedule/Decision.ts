import type { Interval } from "@effect/core/io/Schedule/Interval"
import { Intervals } from "@effect/core/io/Schedule/Intervals"
import * as List from "@fp-ts/data/List"

/**
 * @tsplus type effect/core/io/Schedule/Decision
 * @category model
 * @since 1.0.0
 */
export type Decision = Continue | Done

/**
 * @category model
 * @since 1.0.0
 */
export interface Continue {
  readonly _tag: "Continue"
  readonly intervals: Intervals
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Done {
  readonly _tag: "Done"
}

/**
 * @tsplus type effect/core/io/Schedule/Decision.Ops
 * @category model
 * @since 1.0.0
 */
export interface DecisionOps {}
export const Decision: DecisionOps = {}

/**
 * @tsplus static effect/core/io/Schedule/Decision.Ops Continue
 * @category constructors
 * @since 1.0.0
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
 * @category constructors
 * @since 1.0.0
 */
export function continueWith(interval: Interval): Decision {
  return {
    _tag: "Continue",
    intervals: Intervals(List.of(interval))
  }
}

/**
 * @tsplus static effect/core/io/Schedule/Decision.Ops Done
 * @category constructors
 * @since 1.0.0
 */
export const done: Decision = {
  _tag: "Done"
}
