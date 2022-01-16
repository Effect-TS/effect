// ets_tracing: off

import * as O from "../../Option"
import type { UIO } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns an effect with the optional value.
 */
export function some<A>(a: A, __trace?: string): UIO<O.Option<A>> {
  return succeed(() => O.some(a), __trace)
}
