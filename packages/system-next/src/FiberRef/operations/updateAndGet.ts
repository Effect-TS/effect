import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the result.
 */
export function updateAndGet_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __trace?: string
): IO<EA | EB, A> {
  return modify_(
    self,
    (v) => {
      const result = f(v)
      return Tp.tuple(result, result)
    },
    __trace
  )
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the result.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    updateAndGet_(self, f, __trace)
}
