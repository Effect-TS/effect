import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { UIO } from "../../../Effect"
import { FiberRef } from "../../../FiberRef"
import { Metric } from "../../Metric"
import { MetricClient } from "../../MetricClient"
import { MetricKey } from "../../MetricKey"
import type { MetricLabel } from "../../MetricLabel"
import type { Summary } from "../definition"
import { concreteSummary } from "./_internal/InternalSummary"

/**
 * Converts this summary metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @tsplus fluent ets/Summary taggedWith
 */
export function taggedWith_<A>(
  self: Summary<A>,
  f: (a: A) => Chunk<MetricLabel>
): Metric<A> {
  const cloned = self.copy()
  concreteSummary(cloned)
  cloned.summaryRef = FiberRef.unsafeMake(cloned.summary!)
  cloned.summary = undefined
  return Metric<A>(cloned.name, cloned.tags, (effect) =>
    cloned.appliedAspect(effect.tap(changeSummary(cloned, f)))
  )
}

/**
 * Converts this summary metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @ets_data_first taggedWith_
 */
export function taggedWith<A>(f: (a: A) => Chunk<MetricLabel>) {
  return (self: Summary<A>): Metric<A> => self.taggedWith(f)
}

function changeSummary<A>(
  self: Summary<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteSummary(self)
    return self.summaryRef!.update((summary) => {
      const extraTags = f(value)
      const allTags = self.tags + extraTags
      return summary.metricKey.tags !== allTags
        ? MetricClient.client.value.getSummary(
            MetricKey.Summary(
              self.name,
              self.maxSize,
              self.maxAge,
              self.error,
              self.quantiles,
              allTags
            )
          )
        : summary
    })
  }
}
