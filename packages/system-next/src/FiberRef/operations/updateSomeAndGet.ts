import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import type { Option } from "../../Option"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 */
export function updateSomeAndGet_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Option<A>,
  __trace?: string
): IO<EA | EB, A> {
  return modify_(
    self,
    (v) => {
      const result = f(v)
      return result._tag === "Some"
        ? Tp.tuple(result.value, result.value)
        : Tp.tuple(v, v)
    },
    __trace
  )
}

/**
 * Atomically modifies the `XFiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => Option<A>, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    updateSomeAndGet_(self, f, __trace)
}
