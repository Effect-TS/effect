import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @tsplus fluent ets/XSynchronized modify
 */
export function modify_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Tuple<[B, A]>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, B> {
  return (self as XRef<RA, RB, EA, EB, A, A>).modify(f)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, B> => self.modify(f)
}
