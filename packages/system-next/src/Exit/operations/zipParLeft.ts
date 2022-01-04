// ets_tracing: off

import { both } from "../../Cause"
import type { Exit } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 */
export function zipParLeft_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, A> {
  return zipWith_(self, that, (a, _) => a, both)
}

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @ets_data_first zipParLeft_
 */
export function zipParLeft<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, A> => zipParLeft_(self, that)
}
