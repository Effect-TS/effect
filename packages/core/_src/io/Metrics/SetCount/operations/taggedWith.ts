import { concreteSetCount } from "@effect-ts/core/io/Metrics/SetCount/operations/_internal/InternalSetCount";

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
  const cloned = self.copy();
  concreteSetCount(cloned);
  cloned.setCountRef = FiberRef.unsafeMake(cloned.setCount!);
  cloned.setCount = undefined;
  return Metric(cloned.name, cloned.tags, (effect) => cloned.appliedAspect(effect.tap(changeSetCount(cloned, f))));
}

// export const taggedWith = Pipeable(taggedWith_)

/**
 * Converts this set count metric to one where the tags depend on the
 * measured effect's result value.
 *
 * @tsplus static ets/SetCount/Aspects taggedWith
 */
export const taggedWith = Pipeable(taggedWith_);

function changeSetCount<A>(
  self: SetCount<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteSetCount(self);
    return self.setCountRef!.update((setCount) => {
      const extraTags = f(value);
      const allTags = self.tags + extraTags;
      return setCount.metricKey.tags !== allTags
        ? MetricClient.client.value.getSetCount(
          MetricKey.SetCount(self.name, self.setTag, allTags)
        )
        : setCount;
    });
  };
}
