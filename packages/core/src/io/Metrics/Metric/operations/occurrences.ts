import { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import { SetCount } from "../../SetCount"

/**
 * A metric aspect that counts the number of occurrences of each distinct
 * value returned by the effect it is applied to.
 *
 * @tsplus static ets/MetricOps occurrences
 */
export function occurrences(
  name: string,
  setTag: string,
  ...tags: Array<MetricLabel>
): SetCount<string> {
  return SetCount<string>(
    name,
    setTag,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((a) => metric.observe(a))
  )
}
