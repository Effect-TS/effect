import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 */
export function getAndUpdate_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __etsTrace?: string
): IO<EA | EB, A> {
  return modify_(self, (v) => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __etsTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    getAndUpdate_(self, f)
}
