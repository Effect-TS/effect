import { Chunk } from "../../../../collection/immutable/Chunk"
import { Counter } from "../../Counter"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that increments the specified counter each time the effect
 * it is applied to succeeds.
 *
 * @tsplus static ets/MetricOps count
 */
export function count(name: string, ...tags: Array<MetricLabel>): Counter<unknown> {
  return Counter(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap(() => metric.increment())
  )
}
