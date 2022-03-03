import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Effect } from "../../../Effect"
import type { MetricLabel } from "../../MetricLabel"
import type { Boundaries, Histogram } from "../definition"
import { InternalHistogram } from "./_internal/InternalHistogram"

/**
 * Creates a new histogram.
 *
 * @tsplus static ets/HistogramOps __call
 */
export function make<A>(
  name: string,
  boundaries: Boundaries,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Histogram<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Histogram<A> {
  return new InternalHistogram(name, boundaries, tags, aspect)
}
