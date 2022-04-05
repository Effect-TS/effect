import { concreteHistogram } from "@effect-ts/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Converts this histogram metric to one where the tags depend on the
 * measured effect's result value.
 *
 * @tsplus fluent ets/Histogram taggedWith
 */
export function taggedWith_<A>(
  self: Histogram<A>,
  f: (a: A) => Chunk<MetricLabel>
): Metric<A> {
  const cloned = self.copy();
  concreteHistogram(cloned);
  cloned.histogramRef = FiberRef.unsafeMake(cloned.histogram!);
  cloned.histogram = undefined;
  return Metric<A>(cloned.name, cloned.tags, (effect) => cloned.appliedAspect(effect.tap(changeHistogram(cloned, f))));
}

/**
 * Converts this histogram metric to one where the tags depend on the
 * measured effect's result value.
 *
 * @tsplus static ets/Histogram/Aspects taggedWith
 */
export const taggedWith = Pipeable(taggedWith_);

function changeHistogram<A>(
  self: Histogram<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteHistogram(self);
    return self.histogramRef!.update((histogram) => {
      const extraTags = f(value);
      const allTags = self.tags + extraTags;
      return histogram.metricKey.tags !== allTags
        ? MetricClient.client.value.getHistogram(
          MetricKey.Histogram(self.name, self.boundaries, allTags)
        )
        : histogram;
    });
  };
}
