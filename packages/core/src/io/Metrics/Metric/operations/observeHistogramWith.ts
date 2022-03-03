import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Boundaries } from "../../Histogram"
import { Histogram } from "../../Histogram"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that adds a value to a histogram each time the effect it is
 * applied to succeeds, using the specified function to transform the value
 * returned by the effect to the value to add to the histogram.
 *
 * @tsplus static ets/MetricOps observeHistogramWith
 */
export function observeHistogramWith(
  name: string,
  boundaries: Boundaries,
  ...tags: Array<MetricLabel>
) {
  return <A>(f: (a: A) => number): Histogram<A> =>
    Histogram(
      name,
      boundaries,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.observe(f(a)))
    )
}
