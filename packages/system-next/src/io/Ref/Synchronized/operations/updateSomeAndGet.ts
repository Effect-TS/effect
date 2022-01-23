import * as Tp from "../../../../collection/immutable/Tuple"
import * as O from "../../../../data/Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 */
export function updateSomeAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
): T.Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) =>
    T.map_(
      O.getOrElse_(pf(v), () => T.succeedNow(v)),
      (result) => Tp.tuple(result, result)
    )
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @ets_data_first updateSomeAndGetEffect_
 */
export function updateSomeAndGetEffect<RC, EC, A>(
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, A> => updateSomeAndGetEffect_(self, pf)
}
