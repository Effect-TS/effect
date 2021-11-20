// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple"
import type { FiberRef } from "./fiberRef"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A) {
  return (self: FiberRef<A>) => update_(self, f)
}

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export function update_<A>(self: FiberRef<A>, f: (a: A) => A) {
  return modify_(self, (v) => Tp.tuple<[void, A]>(undefined, f(v)))
}
