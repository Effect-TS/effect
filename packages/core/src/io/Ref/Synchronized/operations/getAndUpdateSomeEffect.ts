import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 */
export function getAndUpdateSomeEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) =>
    pf(v)
      .getOrElse(Effect.succeedNow(v))
      .map((result) => Tuple(v, result))
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
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => getAndUpdateSomeEffect_(self, pf)
}
