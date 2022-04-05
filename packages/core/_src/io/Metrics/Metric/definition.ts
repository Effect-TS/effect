export const _A = Symbol.for("@effect-ts/core/io/Metric/_A");
export type _A = typeof _A;

/**
 * A `Metric` is able to add collection of metrics to a effect without changing
 * its environment or error types. Aspects are the idiomatic way of adding
 * collection of metrics to effects.
 *
 * @tsplus type ets/Metric
 */
export interface Metric<A> {
  readonly [_A]: (_: A) => void;
  readonly name: string;
  readonly tags: Chunk<MetricLabel>;
  readonly appliedAspect: <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1>;
}

/**
 * @tsplus type ets/Metric/Ops
 */
export interface MetricOps {
  $: MetricAspects;
}
export const Metric: MetricOps = {
  $: {}
};

/**
 * @tsplus type ets/Metric/Aspects
 */
export interface MetricAspects {}

/**
 * @tsplus unify ets/Metric
 */
export function unifyMetric<X extends Metric<any>>(
  self: X
): Metric<[X] extends [Metric<infer AX>] ? AX : never> {
  return self;
}

class ConcreteMetric<A> implements Metric<A> {
  readonly [_A]!: (_: A) => void;

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel>,
    readonly appliedAspect: <R, E, A1 extends A>(
      effect: Effect<R, E, A1>
    ) => Effect<R, E, A1>
  ) {}
}

/**
 * @tsplus static ets/Metric/Ops __call
 */
export function make<A>(
  name: string,
  tags: Chunk<MetricLabel>,
  appliedAspect: <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Metric<A> {
  return new ConcreteMetric(name, tags, appliedAspect);
}
