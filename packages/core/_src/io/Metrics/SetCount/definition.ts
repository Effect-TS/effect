export const SetCountSym = Symbol.for("@effect/core/io/Metrics/SetCount");
export type SetCountSym = typeof SetCountSym;

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
  readonly [SetCountSym]: SetCountSym;
  readonly setTag: string;
}

/**
 * @tsplus type ets/SetCount/Ops
 */
export interface SetCountOps {
  $: SetCountAspects;
}
export const SetCount: SetCountOps = {
  $: {}
};

/**
 * @tsplus type ets/SetCount/Aspects
 */
export interface SetCountAspects {}

/**
 * @tsplus unify ets/SetCount
 */
export function unifySetCount<X extends SetCount<any>>(
  self: X
): SetCount<[X] extends [SetCount<infer AX>] ? AX : never> {
  return self;
}
