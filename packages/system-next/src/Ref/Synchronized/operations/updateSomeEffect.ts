// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 */
export function updateSomeEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
): T.Effect<RA & RB & RC, EA | EB | EC, void> {
  return modifyEffect_(self, (v) =>
    T.map_(
      O.getOrElse_(pf(v), () => T.succeedNow(v)),
      (result) => Tp.tuple(undefined, result)
    )
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @ets_data_first updateSomeEffect_
 */
export function updateSomeEffect<RC, EC, A>(
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
) {
  ;<RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, void> => updateSomeEffect_(self, pf)
}
