export const CounterSym = Symbol.for("@effect/core/io/Metrics/Counter");
export type CounterSym = typeof CounterSym;

/**
 * A `Counter` is a metric representing a single numerical value that may be
 * incremented over time. A typical use of this metric would be to track the
 * number of a certain type of request received. With a counter the quantity
 * of interest is the cumulative value over time, as opposed to a gauge where
 * the quantity of interest is the value as of a specific point in time.
 *
 * @tsplus type ets/Counter
 */
export interface Counter<A> extends Metric<A> {
  readonly [CounterSym]: CounterSym;
}

/**
 * @tsplus type ets/Counter/Ops
 */
export interface CounterOps {
  $: CounterAspects;
}
export const Counter: CounterOps = {
  $: {}
};

/**
 * @tsplus type ets/Counter/Aspects
 */
export interface CounterAspects {}

/**
 * @tsplus unify ets/Counter
 */
export function unifyCounter<X extends Counter<any>>(
  self: X
): Counter<[X] extends [Counter<infer AX>] ? AX : never> {
  return self;
}
