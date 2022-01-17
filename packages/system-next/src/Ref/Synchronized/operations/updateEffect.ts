import * as Tp from "../../../Collections/Immutable/Tuple"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 */
export function updateEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<RC, EC, A>
): T.Effect<RA & RB & RC, EA | EB | EC, void> {
  return modifyEffect_(self, (v) =>
    T.map_(f(v), (result) => Tp.tuple(undefined, result))
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 *
 * @ets_data_first updateEffect_
 */
export function updateEffect<RC, EC, A>(f: (a: A) => T.Effect<RC, EC, A>) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, void> => updateEffect_(self, f)
}
