import {
  concreteCounter,
  InternalCounter
} from "@effect-ts/core/io/Metrics/Counter/operations/_internal/InternalCounter";

/**
 * Returns a copy of this counter with the specified name and/or tags.
 *
 * @tsplus fluent ets/Counter copy
 */
export function copy_<A>(
  self: Counter<A>,
  params?: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel>; }>
): Counter<A> {
  concreteCounter(self);
  return new InternalCounter(
    (params && params.name) || self.name,
    (params && params.tags) || self.tags,
    self.aspect
  );
}

/**
 * Returns a copy of this counter with the specified name and/or tags.
 *
 * @tsplus static ets/Counter/Aspects copy
 */
export const copy = Pipeable(copy_);
