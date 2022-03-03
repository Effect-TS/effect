import { Chunk } from "../../../../collection/immutable/Chunk"
import { Counter } from "../../Counter"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that increments the specified counter each time the effect
 * it is applied to fails.
 *
 * @tsplus static ets/MetricOps countErrors
 */
export function countErrors(
  name: string,
  ...tags: Array<MetricLabel>
): Counter<unknown> {
  return Counter(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tapError(() => metric.increment())
  )
}
