import type { Effect } from "../../Effect"

export const MetricSym = Symbol.for("@effect-ts/core/io/Metric")
export type MetricSym = typeof MetricSym

export const _A = Symbol.for("@effect-ts/core/io/Metric/_A")
export type _A = typeof _A

/**
 * A `Metric` is able to add collection of metrics to a effect without changing
 * its environment or error types. Aspects are the idiomatic way of adding
 * collection of metrics to effects.
 *
 * @tsplus type ets/Metric
 */
export interface Metric<A> {
  readonly [MetricSym]: MetricSym
  readonly [_A]: (_: A) => void
}

/**
 * @tsplus type ets/MetricOps
 */
export interface MetricOps {}
export const Metric: MetricOps = {}

/**
 * @tsplus unify ets/Metric
 */
export function unifyMetric<X extends Metric<any>>(
  self: X
): Metric<[X] extends [Metric<infer AX>] ? AX : never> {
  return self
}

export class BaseMetric<A> implements Metric<A> {
  readonly [MetricSym]: MetricSym = MetricSym;
  readonly [_A]: (_: A) => void
}

export class InternalMetric<A> extends BaseMetric<A> {
  constructor(
    readonly _track: <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    super()
  }
}

/**
 * @tsplus static ets/MetricOps __call
 */
export function make<A>(
  track: <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Metric<A> {
  return new InternalMetric(track)
}

/**
 * @tsplus macro remove
 */
export function concreteMetric<A>(_: Metric<A>): asserts _ is InternalMetric<A> {
  //
}

/**
 * @tsplus static ets/MetricOps isMetric
 */
export function isMetric(u: unknown): u is Metric<any> {
  return typeof u === "object" && u != null && MetricSym in u
}
