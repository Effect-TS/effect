// ets_tracing: off

import type { Option } from "../../Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { none } from "./none"
import { suspend } from "./suspend"

/**
 * The moral equivalent of `if (!p) exp`.
 */
export function unless_<R, E, A>(
  self: Managed<R, E, A>,
  b: () => boolean,
  __trace?: string
): Managed<R, E, Option<A>> {
  return suspend(() => (b() ? none : asSome(self)), __trace)
}

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @ets_data_first unless_
 */
export function unless(b: () => boolean, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Option<A>> =>
    unless_(self, b, __trace)
}
