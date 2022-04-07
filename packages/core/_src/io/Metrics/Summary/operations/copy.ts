import {
  concreteSummary,
  InternalSummary
} from "@effect/core/io/Metrics/Summary/operations/_internal/InternalSummary";

/**
 * Returns a copy of this counter with the specified properties.
 *
 * @tsplus fluent ets/Summary copy
 */
export function copy_<A>(
  self: Summary<A>,
  params?: Partial<{
    readonly name: string;
    readonly maxSize: number;
    readonly maxAge: Duration;
    readonly error: number;
    readonly quantiles: Chunk<number>;
    readonly tags: Chunk<MetricLabel>;
  }>
): Summary<A> {
  concreteSummary(self);
  return new InternalSummary(
    (params && params.name) || self.name,
    (params && params.maxSize) || self.maxSize,
    (params && params.maxAge) || self.maxAge,
    (params && params.error) || self.error,
    (params && params.quantiles) || self.quantiles,
    (params && params.tags) || self.tags,
    self.aspect
  );
}

/**
 * Returns a copy of this counter with the specified properties.
 *
 * @tsplus static ets/Summary/Aspects copy
 */
export const copy = Pipeable(copy_);
