import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification. This is a more
 * powerful version of `update`.
 */
export function modifyEffect_<RA, RB, RC, EA, EB, EC, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, B> {
  return self.withPermit(
    self.unsafeGet.flatMap((a) =>
      f(a).flatMap(({ tuple: [b, a] }) => self.unsafeSet(a).map(() => b))
    )
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification. This is a more
 * powerful version of `update`.
 *
 * @ets_data_first modifyEffect_
 */
export function modifyEffect<RC, EC, A, B>(
  f: (a: A) => Effect<RC, EC, Tuple<[B, A]>>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, B> => modifyEffect_(self, f)
}
