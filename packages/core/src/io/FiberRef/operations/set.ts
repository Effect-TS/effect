import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Sets the value associated with the current fiber.
 *
 * @tsplus fluent ets/FiberRef set
 */
export function set_<A>(
  self: FiberRef<A>,
  value: A,
  __tsplusTrace?: string
): UIO<void> {
  return self.modify(() => Tuple(undefined, value))
}

/**
 * Sets the value associated with the current fiber.
 */
export const set = Pipeable(set_)
