// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple"
import { access } from "./core"

/**
 * Returns an effectful function that merely swaps the elements in a `Tuple2`.
 */
export function swap<A, B>(__trace?: string) {
  return access(({ tuple: [a, b] }: Tp.Tuple<[A, B]>) => Tp.tuple(b, a), __trace)
}
