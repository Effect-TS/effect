import * as Tp from "../../Collections/Immutable/Tuple"
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
  __trace?: string
): IO<EA | EB, A> {
  return modify_(self, (v) => Tp.tuple(v, f(v)), __trace)
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    getAndUpdate_(self, f, __trace)
}
