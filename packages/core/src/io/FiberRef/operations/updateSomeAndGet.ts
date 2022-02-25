import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { IO } from "../../Effect"
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
  __tsplusTrace?: string
): IO<EA | EB, A> {
  return modify_(self, (v) => {
    const result = f(v)
    return result._tag === "Some" ? Tuple(result.value, result.value) : Tuple(v, v)
  })
}

/**
 * Atomically modifies the `XFiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    updateSomeAndGet_(self, f)
}
