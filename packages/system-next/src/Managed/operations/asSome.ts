import * as O from "../../Option"
import type { Managed } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, O.Option<A>> {
  return map_(self, O.some)
}
