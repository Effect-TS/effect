// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { RIO } from "../managed.js"
import { access } from "./api.js"

/**
 * Returns an effectful function that merely swaps the elements in a `Tuple`.
 */
export function swap<A, B>(__trace?: string): RIO<Tp.Tuple<[A, B]>, Tp.Tuple<[B, A]>> {
  return access(({ tuple: [a, b] }: Tp.Tuple<[A, B]>) => Tp.tuple(b, a), __trace)
}
