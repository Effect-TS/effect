import { Chunk } from "../../../../collection/immutable/Chunk"
import { Counter } from "../../Counter"
import type { MetricLabel } from "../../MetricLabel"

/**
 * A metric aspect that increments the specified counter with the specified
 * function.
 *
 * @tsplus static ets/MetricOps countValueWith
 */
export function countValueWith(name: string, ...tags: Array<MetricLabel>) {
  return <A>(f: (a: A) => number): Counter<A> =>
    Counter(
      name,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.increment(f(a)))
    )
}
