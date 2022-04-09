import type { Boundaries } from "@effect/core/io/Metrics/Histogram/definition";
import { InternalHistogram } from "@effect/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Creates a new histogram.
 *
 * @tsplus static ets/Histogram/Ops __call
 */
export function make<A>(
  name: string,
  boundaries: Boundaries,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Histogram<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Histogram<A> {
  return new InternalHistogram(name, boundaries, tags, aspect);
}
