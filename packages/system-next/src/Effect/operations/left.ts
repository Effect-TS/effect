// ets_tracing: off

import * as E from "../../Either"
import type { UIO } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns an effect with the value on the left part.
 */
export function left<A>(value: A, __trace?: string): UIO<E.Either<A, never>> {
  return succeed(() => E.left(value))
}
