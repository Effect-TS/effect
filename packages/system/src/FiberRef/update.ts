// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { XFiberRef } from "./fiberRef.js"
import { modify_ } from "./modify.js"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>) => update_(self, f)
}

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export function update_<EA, EB, A>(self: XFiberRef<EA, EB, A, A>, f: (a: A) => A) {
  return modify_(self, (v) => Tp.tuple<[void, A]>(undefined, f(v)))
}
