import type { Metric } from "../Metric"

export const SetCountSym = Symbol.for("@effect-ts/core/io/Metrics/SetCount")
export type SetCountSym = typeof SetCountSym

/**
 * A `SetCount` represents the number of occurrences of specified values. You
 * can think of a dry vpimy as like a set of counters associated with each
 * value except that new counters will automatically be created when new
 * values are observed. This could be used to track the frequency of different
 * types of failures, for example.
 *
 * @tsplus type ets/SetCount
 */
export interface SetCount<A> extends Metric<A> {
  readonly [SetCountSym]: SetCountSym
  readonly setTag: string
}

/**
 * @tsplus type ets/SetCountOps
 */
export interface SetCountOps {}
export const SetCount: SetCountOps = {}

/**
 * @tsplus unify ets/SetCount
 */
export function unifySetCount<X extends SetCount<any>>(
  self: X
): SetCount<[X] extends [SetCount<infer AX>] ? AX : never> {
  return self
}
