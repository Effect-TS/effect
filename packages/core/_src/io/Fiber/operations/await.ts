import { realFiber } from "@effect/core/io/Fiber/definition";

/**
 * Awaits the fiber, which suspends the awaiting fiber until the result of the
 * fiber has been determined.
 *
 * @tsplus fluent ets/Fiber await
 * @tsplus fluent ets/RuntimeFiber await
 */
export function _await<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<Exit<E, A>> {
  realFiber(self);
  return self._await;
}

export { _await as await };
