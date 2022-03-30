import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { Ref } from "../definition"

/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 *
 * @tsplus fluent ets/Ref updateAndGet
 */
export function updateAndGet_<A>(
  self: Ref<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => {
    const result = f(v)
    return Tuple(result, result)
  })
}

/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 */
export const updateAndGet = Pipeable(updateAndGet_)
