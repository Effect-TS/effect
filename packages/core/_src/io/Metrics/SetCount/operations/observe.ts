import { withSetCount } from "@effect-ts/core/io/Metrics/SetCount/operations/_internal/InternalSetCount";

/**
 * Increments the counter associated with the specified value by one.
 *
 * @tsplus fluent ets/SetCount observe
 */
export function observe_<A>(
  self: SetCount<A>,
  value: string,
  __tsplusTrace?: string
): UIO<unknown> {
  return withSetCount(self, (setCount) => setCount.observe(value));
}

/**
 * Increments the counter associated with the specified value by one.
 *
 * @tsplus static ets/SetCount/Aspects observe
 */
export const observe = Pipeable(observe_);
