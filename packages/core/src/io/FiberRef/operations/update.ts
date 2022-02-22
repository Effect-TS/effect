import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 */
export function update_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __etsTrace?: string
): IO<EA | EB, void> {
  return modify_(self, (v) => Tuple(undefined, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __etsTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, void> => update_(self, f)
}
