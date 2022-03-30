import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 *
 * @tsplus fluent ets/FiberRef update
 */
export function update_<A>(
  self: FiberRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<void> {
  return self.modify((v) => Tuple(undefined, f(v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export const update = Pipeable(update_)
