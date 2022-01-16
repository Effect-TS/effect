// ets_tracing: off

import type { Option } from "../../Option"
import type { Managed } from "../definition"
import { orElse_ } from "./orElse"
import { succeed } from "./succeed"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Managed<R, Option<E>, A>,
  that: () => A2,
  __trace?: string
): Managed<R, Option<E>, A | A2> {
  return orElse_(self, () => succeed(that), __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<R, E, A, A2>(that: () => A2, __trace?: string) {
  return (self: Managed<R, Option<E>, A>) => orElseSucceed_(self, that, __trace)
}
