import { concreteSummary } from "@effect-ts/core/io/Metrics/Summary/operations/_internal/InternalSummary";

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
  const cloned = self.copy();
  concreteSummary(cloned);
  cloned.summaryRef = FiberRef.unsafeMake(cloned.summary!);
  cloned.summary = undefined;
  return Metric<A>(cloned.name, cloned.tags, (effect) => cloned.appliedAspect(effect.tap(changeSummary(cloned, f))));
}

/**
 * Converts this summary metric to one where the tags depend on the measured
 * effect's result value.
 *
 * @tsplus static ets/Summary/Aspects taggedWith
 */
export const taggedWith = Pipeable(taggedWith_);

function changeSummary<A>(
  self: Summary<A>,
  f: (a: A) => Chunk<MetricLabel>,
  __tsplusTrace?: string
) {
  return (value: A): UIO<void> => {
    concreteSummary(self);
    return self.summaryRef!.update((summary) => {
      const extraTags = f(value);
      const allTags = self.tags + extraTags;
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
        : summary;
    });
  };
}
