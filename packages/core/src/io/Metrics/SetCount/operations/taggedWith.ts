import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { UIO } from "../../../Effect"
import { FiberRef } from "../../../FiberRef"
import { Metric } from "../../Metric"
import { MetricClient } from "../../MetricClient"
import { MetricKey } from "../../MetricKey"
import type { MetricLabel } from "../../MetricLabel"
import type { SetCount } from "../definition"
import { concreteSetCount } from "./_internal/InternalSetCount"

/**
 * Converts this set count metric to one where the tags depend on the
 * measured effect's result value.
 *
 * @tsplus fluent ets/SetCount taggedWith
 */
export function taggedWith_<A>(
  self: SetCount<A>,
  f: (a: A) => Chunk<MetricLabel>
): Metric<A> {
  const cloned = self.copy()
  concreteSetCount(cloned)
  cloned.setCountRef = FiberRef.unsafeMake(cloned.setCount!)
  cloned.setCount = undefined
  return Metric(cloned.name, cloned.tags, (effect) =>
    cloned.appliedAspect(effect.tap(changeSetCount(cloned, f)))
  )
}

export const taggedWith = Pipeable(taggedWith_)

function changeSetCount<A>(
  self: SetCount<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteSetCount(self)
    return self.setCountRef!.update((setCount) => {
      const extraTags = f(value)
      const allTags = self.tags + extraTags
      return setCount.metricKey.tags !== allTags
        ? MetricClient.client.value.getSetCount(
            MetricKey.SetCount(self.name, self.setTag, allTags)
          )
        : setCount
    })
  }
}
