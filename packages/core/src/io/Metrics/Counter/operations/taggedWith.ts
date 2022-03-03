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
  return Metric<A>(cloned.name, cloned.tags, (effect) =>
    cloned.appliedAspect(effect.tap(changeCounter(cloned, f)))
  )
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

function changeCounter<A>(
  self: Counter<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteCounter(self)
    return self.counterRef!.update((counter) => {
      const extraTags = f(value)
      const allTags = self.tags + extraTags
      return counter.metricKey.tags !== allTags
        ? MetricClient.client.value.getCounter(MetricKey.Counter(self.name, allTags))
        : counter
    })
  }
}
