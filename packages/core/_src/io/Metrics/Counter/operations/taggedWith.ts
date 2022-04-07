import { concreteCounter } from "@effect/core/io/Metrics/Counter/operations/_internal/InternalCounter";

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
  const cloned = self.copy();
  concreteCounter(cloned);
  cloned.counterRef = FiberRef.unsafeMake(cloned.counter!);
  cloned.counter = undefined;
  return Metric<A>(cloned.name, cloned.tags, (effect) => cloned.appliedAspect(effect.tap(changeCounter(cloned, f))));
}

/**
 * Converts this counter metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @tsplus static ets/Counter/Aspects taggedWith
 */
export const taggedWith = Pipeable(taggedWith_);

function changeCounter<A>(
  self: Counter<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteCounter(self);
    return self.counterRef!.update((counter) => {
      const extraTags = f(value);
      const allTags = self.tags + extraTags;
      return counter.metricKey.tags !== allTags
        ? MetricClient.client.value.getCounter(MetricKey.Counter(self.name, allTags))
        : counter;
    });
  };
}
