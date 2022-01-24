import * as Tp from "../../../../collection/immutable/Tuple"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 */
export function updateAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<RC, EC, A>
): T.Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) => T.map_(f(v), (result) => Tp.tuple(result, result)))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 *
 * @ets_data_first updateAndGetEffect_
 */
export function updateAndGetEffect<RC, EC, A>(f: (a: A) => T.Effect<RC, EC, A>) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, A> => updateAndGetEffect_(self, f)
}
