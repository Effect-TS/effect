// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Option } from "../Option/index.js"
import { getOrElse_ } from "../Option/index.js"
import { modify } from "./modify.js"

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet<A>(f: (a: A) => Option<A>) {
  return modify<A, A>((v) => {
    const result = getOrElse_(f(v), () => v)
    return Tp.tuple(result, result)
  })
}
