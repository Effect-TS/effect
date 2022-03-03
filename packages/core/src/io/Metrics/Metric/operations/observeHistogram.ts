import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Boundaries } from "../../Histogram"
import { Histogram } from "../../Histogram"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that adds a value to a histogram each time the effect it is
 * applied to succeeds.
 *
 * @tsplus static ets/MetricOps observeHistogram
 */
export function observeHistogram(
  name: string,
  boundaries: Boundaries,
  ...tags: Array<MetricLabel>
): Histogram<number> {
  return Histogram(
    name,
    boundaries,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.observe(n))
  )
}
