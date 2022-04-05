import { realFiber } from "@effect-ts/core/io/Fiber/definition";

/**
 * Inherits values from all `FiberRef` instances into current fiber. This
 * will resume immediately.
 *
 * @tsplus fluent ets/Fiber inheritRefs
 * @tsplus fluent ets/RuntimeFiber inheritRefs
 */
export function inheritRefs<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<void> {
  realFiber(self);
  return self._inheritRefs;
}
