import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { UIO } from "../../../Effect"
import { FiberRef } from "../../../FiberRef"
import { Metric } from "../../Metric"
import { MetricClient } from "../../MetricClient"
import { MetricKey } from "../../MetricKey"
import type { MetricLabel } from "../../MetricLabel"
import type { Gauge } from "../definition"
import { concreteGauge } from "./_internal/InternalGauge"

/**
 * Converts this gauge metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @tsplus fluent ets/Gauge taggedWith
 */
export function taggedWith_<A>(
  self: Gauge<A>,
  f: (a: A) => Chunk<MetricLabel>
): Metric<A> {
  const cloned = self.copy()
  concreteGauge(cloned)
  cloned.gaugeRef = FiberRef.unsafeMake(cloned.gauge!)
  cloned.gauge = undefined
  return Metric<A>(cloned.name, cloned.tags, (effect) =>
    cloned.appliedAspect(effect.tap(changeGauge(cloned, f)))
  )
}

/**
 * Converts this gauge metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @ets_data_first taggedWith_
 */
export function taggedWith<A>(f: (a: A) => Chunk<MetricLabel>) {
  return (self: Gauge<A>): Metric<A> => self.taggedWith(f)
}

function changeGauge<A>(
  self: Gauge<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteGauge(self)
    return self.gaugeRef!.update((gauge) => {
      const extraTags = f(value)
      const allTags = self.tags + extraTags
      return gauge.metricKey.tags !== allTags
        ? MetricClient.client.value.getGauge(MetricKey.Gauge(self.name, allTags))
        : gauge
    })
  }
}
