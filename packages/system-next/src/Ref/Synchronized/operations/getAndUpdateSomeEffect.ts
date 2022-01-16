// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 */
export function getAndUpdateSomeEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
): T.Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) =>
    T.map_(
      O.getOrElse_(pf(v), () => T.succeedNow(v)),
      (result) => Tp.tuple(v, result)
    )
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @ets_data_first getAndUpdateSomeEffect_
 */
export function getAndUpdateSomeEffect<RC, EC, A>(
  pf: (a: A) => O.Option<T.Effect<RC, EC, A>>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, A> => getAndUpdateSomeEffect_(self, pf)
}
