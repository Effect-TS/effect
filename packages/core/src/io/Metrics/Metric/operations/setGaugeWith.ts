import { Chunk } from "../../../../collection/immutable/Chunk"
import { Gauge } from "../../Gauge"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that sets a gauge each time the effect it is applied to
 * succeeds, using the specified function to transform the value returned by
 * the effect to the value to set the gauge to.
 *
 * @tsplus static ets/MetricOps setGaugeWith
 */
export function setGaugeWith(name: string, ...tags: Array<MetricLabel>) {
  return <A>(f: (a: A) => number): Gauge<A> =>
    Gauge(
      name,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.set(f(a)))
    )
}
