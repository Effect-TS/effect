import { InternalCounter } from "@effect-ts/core/io/Metrics/Counter/operations/_internal/InternalCounter";

/**
 * Creates a new counter.
 *
 * @tsplus static ets/Counter/Ops __call
 */
export function make<A>(
  name: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Counter<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Counter<A> {
  return new InternalCounter(name, tags, aspect);
}
