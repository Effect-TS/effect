// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import type { Option } from "../../Option"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Option<A>,
  __trace?: string
): IO<EA | EB, void> {
  return modify_(
    self,
    (v) => {
      const result = f(v)
      return Tp.tuple(undefined, result._tag === "Some" ? result.value : v)
    },
    __trace
  )
}

/**
 * Atomically modifies the `XFiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(f: (a: A) => Option<A>, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, void> =>
    updateSome_(self, f, __trace)
}
