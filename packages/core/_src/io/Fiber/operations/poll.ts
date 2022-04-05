import { realFiber } from "@effect-ts/core/io/Fiber/definition";

/**
 * Tentatively observes the fiber, but returns immediately if it is not
 * already done.
 *
 * @tsplus fluent ets/Fiber poll
 * @tsplus fluent ets/RuntimeFiber poll
 */
export function poll<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<Option<Exit<E, A>>> {
  realFiber(self);
  return self._poll;
}
