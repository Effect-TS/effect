import { Chunk } from "../../../../collection/immutable/Chunk"
import { Gauge } from "../../Gauge"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that adjusts a gauge each time the effect it is applied to
 * succeeds.
 *
 * @tsplus static ets/MetricOps adjustGauge
 */
export function adjustGauge(name: string, ...tags: Array<MetricLabel>): Gauge<number> {
  return Gauge(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.adjust(n))
  )
}
