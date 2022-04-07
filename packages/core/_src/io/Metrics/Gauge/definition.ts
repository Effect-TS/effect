export const GaugeSym = Symbol.for("@effect/core/io/Metrics/Gauge");
export type GaugeSym = typeof GaugeSym;

/**
 * A `Gauge` is a metric representing a single numerical value that may be set
 * or adjusted. A typical use of this metric would be to track the current
 * memory usage. With a guage the quantity of interest is the current value,
 * as opposed to a counter where the quantity of interest is the cumulative
 * values over time.
 *
 * @tsplus type ets/Gauge
 */
export interface Gauge<A> extends Metric<A> {
  readonly [GaugeSym]: GaugeSym;
}

/**
 * @tsplus type ets/Gauge/Ops
 */
export interface GaugeOps {
  $: GaugeAspects;
}
export const Gauge: GaugeOps = {
  $: {}
};

/**
 * @tsplus type ets/Gauge/Aspects
 */
export interface GaugeAspects {}

/**
 * @tsplus unify ets/Gauge
 */
export function unifyGauge<X extends Gauge<any>>(
  self: X
): Gauge<[X] extends [Gauge<infer AX>] ? AX : never> {
  return self;
}
