import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { Ref } from "../definition"

/**
 * Atomically modifies the `Ref` with the specified function.
 *
 * @tsplus fluent ets/Ref update
 */
export function update_<A>(
  self: Ref<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<void> {
  return self.modify((v) => Tuple(undefined, f(v)))
}

/**
 * Atomically modifies the `Ref` with the specified function.
 */
export const update = Pipeable(update_)
