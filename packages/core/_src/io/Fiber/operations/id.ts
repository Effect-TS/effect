import { realFiber } from "@effect-ts/core/io/Fiber/definition";

/**
 * The identity of the fiber.
 *
 * @tsplus fluent ets/Fiber id
 * @tsplus fluent ets/RuntimeFiber id
 */
export function id<E, A>(self: Fiber<E, A>): FiberId {
  realFiber(self);
  return self._id;
}
