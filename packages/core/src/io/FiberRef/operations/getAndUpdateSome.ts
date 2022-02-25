import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 */
export function getAndUpdateSome_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): IO<EA | EB, A> {
  return modify_(self, (v) => {
    const result = f(v)
    return Tuple(v, result._tag === "Some" ? result.value : v)
  })
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(f: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    getAndUpdateSome_(self, f)
}
