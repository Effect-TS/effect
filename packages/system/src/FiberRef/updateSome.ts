// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple"
import type { Option } from "../Option"
import { getOrElse_ } from "../Option"
import { modify } from "./modify.js"

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 */
export function updateSome<A>(f: (a: A) => Option<A>) {
  return modify<A, void>((v) =>
    Tp.tuple(
      undefined,
      getOrElse_(f(v), () => v)
    )
  )
}
