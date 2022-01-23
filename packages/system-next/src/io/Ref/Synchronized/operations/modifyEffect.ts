import type * as Tp from "../../../../collection/immutable/Tuple"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification. This is a more
 * powerful version of `update`.
 */
export function modifyEffect_<RA, RB, RC, EA, EB, EC, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<RC, EC, Tp.Tuple<[B, A]>>
): T.Effect<RA & RB & RC, EA | EB | EC, B> {
  return self.withPermit(
    T.chain_(self.unsafeGet, (a) =>
      T.chain_(f(a), ({ tuple: [b, a] }) => T.map_(self.unsafeSet(a), () => b))
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
  f: (a: A) => T.Effect<RC, EC, Tp.Tuple<[B, A]>>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, B> => modifyEffect_(self, f)
}
