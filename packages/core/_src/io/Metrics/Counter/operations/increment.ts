import { withCounter } from "@effect/core/io/Metrics/Counter/operations/_internal/InternalCounter";

/**
 * Increments this counter by the specified amount.
 *
 * @tsplus fluent ets/Counter increment
 */
export function increment_<A>(
  self: Counter<A>,
  value = 1,
  __tsplusTrace?: string
): UIO<void> {
  return withCounter(self, (counter) => counter.increment(value)).asUnit();
}

/**
 * Increments this counter by the specified amount.
 *
 * @tsplus static ets/Counter/Aspects increment
 */
export const increment = Pipeable(increment_);
