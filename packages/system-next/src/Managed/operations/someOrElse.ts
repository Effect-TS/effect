import * as O from "../../Option"
import type { Managed } from "../definition"
import { map_ } from "./map"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse_<R, E, A, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: () => B,
  __trace?: string
) {
  return map_(self, O.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: () => B, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>): Managed<R, E, A | B> =>
    someOrElse_(self, orElse, __trace)
}
