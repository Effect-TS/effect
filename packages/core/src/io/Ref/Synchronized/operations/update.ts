import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 *
 * @tsplus fluent ets/Ref/Synchronized update
 */
export function update_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<void> {
  return (self as Ref<A>).update(f)
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 */
export const update = Pipeable(update_)
