import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Duration } from "../../../../data/Duration"
import { Effect } from "../../../Effect"
import type { Boundaries } from "../../Histogram"
import { Histogram } from "../../Histogram"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that tracks how long the effect it is applied to takes to
 * complete execution, recording the results in a histogram.
 *
 * @tsplus static ets/MetricOps observeDurations
 */
export function observeDurations(
  name: string,
  boundaries: Boundaries,
  ...tags: Array<MetricLabel>
) {
  return <A>(f: (duration: Duration) => number): Histogram<A> =>
    Histogram(
      name,
      boundaries,
      Chunk.from(tags),
      (metric) => (effect) =>
        effect
          .timedWith(Effect.succeed(Date.now()))
          .flatMap(({ tuple: [duration, a] }) => metric.observe(f(duration)).as(a))
    )
}
