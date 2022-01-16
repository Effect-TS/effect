import type { Option } from "../../Option"
import { none } from "../../Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"

/**
 * The moral equivalent of `if (p) exp`
 */
export function when_<R, E, A>(
  self: Managed<R, E, A>,
  b: () => boolean,
  __trace?: string
): Managed<R, E, Option<A>> {
  return suspend(() => (b() ? asSome(self) : succeedNow(none)), __trace)
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets_data_first when_
 */
export function when(b: () => boolean, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Option<A>> =>
    when_(self, b, __trace)
}
