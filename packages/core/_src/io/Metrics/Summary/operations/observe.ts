import { withSummary } from "@effect-ts/core/io/Metrics/Summary/operations/_internal/InternalSummary";

/**
 * Adds the specified value to the time series represented by this summary,
 * also recording the instant when the value was observed.
 *
 * @tsplus fluent ets/Summary observe
 */
export function observe_<A>(
  self: Summary<A>,
  value: number,
  __tsplusTrace?: string
): UIO<unknown> {
  return withSummary(self, (summary) => summary.observe(value));
}

/**
 * Adds the specified value to the time series represented by this summary,
 * also recording the instant when the value was observed.
 *
 * @tsplus static ets/Summary/Aspects observe
 */
export const observe = Pipeable(observe_);
