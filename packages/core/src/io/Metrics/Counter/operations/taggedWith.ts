import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { UIO } from "../../../Effect"
import { FiberRef } from "../../../FiberRef"
import { Metric } from "../../Metric"
import { MetricClient } from "../../MetricClient"
import { MetricKey } from "../../MetricKey"
import type { MetricLabel } from "../../MetricLabel"
import type { Counter } from "../definition"
import { concreteCounter } from "./_internal/InternalCounter"

/**
 * Converts this counter metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @tsplus fluent ets/Counter taggedWith
 */
export function taggedWith_<A>(
  self: Counter<A>,
  f: (a: A) => Chunk<MetricLabel>
): Metric<A> {
  const cloned = self.copy()
  concreteCounter(cloned)
  cloned.counterRef = FiberRef.unsafeMake(cloned.counter!)
  cloned.counter = undefined

  function changeCounter(value: A, __tsplusTrace?: string): UIO<void> {
    concreteCounter(cloned)
    return cloned.counterRef!.update((counter) => {
      const extraTags = f(value)
      const allTags = cloned.tags + extraTags
      return counter.metricKey.tags !== allTags
        ? MetricClient.client.value.getCounter(MetricKey.Counter(cloned.name, allTags))
        : counter
    })
  }

  return Metric<A>((effect) => cloned.aspect(cloned)(effect.tap(changeCounter)))
}

/**
 * Converts this counter metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @ets_data_first taggedWith_
 */
export function taggedWith<A>(f: (a: A) => Chunk<MetricLabel>) {
  return (self: Counter<A>): Metric<A> => self.taggedWith(f)
}
