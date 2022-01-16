// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 */
export function update_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __trace?: string
): IO<EA | EB, void> {
  return modify_(self, (v) => Tp.tuple(undefined, f(v)), __trace)
}

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, void> =>
    update_(self, f, __trace)
}
