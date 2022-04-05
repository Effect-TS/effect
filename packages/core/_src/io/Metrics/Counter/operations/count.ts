import { withCounter } from "@effect-ts/core/io/Metrics/Counter/operations/_internal/InternalCounter";

/**
 * Returns the current value of this counter.
 *
 * @tsplus fluent ets/Counter count
 */
export function count<A>(self: Counter<A>, __tsplusTrace?: string): UIO<number> {
  return withCounter(self, (counter) => counter.count());
}
