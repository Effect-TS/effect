import type { Interval } from "./Interval"

/**
 * @tsplus type ets/Decision
 */
export type Decision = Continue | Done

export interface Continue {
  readonly _tag: "Continue"
  readonly interval: Interval
}

export interface Done {
  readonly _tag: "Done"
}

/**
 * @tsplus type ets/DecisionOps
 */
export interface DecisionOps {}
export const Decision: DecisionOps = {}

/**
 * @tsplus static ets/DecisionOps Continue
 */
export function _continue(interval: Interval): Decision {
  return {
    _tag: "Continue",
    interval
  }
}

export { _continue as continue }

/**
 * @tsplus static ets/DecisionOps Done
 */
export const done: Decision = {
  _tag: "Done"
}
