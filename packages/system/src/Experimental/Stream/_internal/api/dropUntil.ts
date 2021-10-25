// ets_tracing: off

import type { Predicate } from "../../../../Function"
import type * as C from "../core"
import * as Drop from "./drop"
import * as DropWhile from "./dropWhile"

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A> {
  return Drop.drop_(
    DropWhile.dropWhile_(self, (_) => !f(_)),
    1
  )
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 *
 * @ets_data_first dropUntil_
 */
export function dropUntil<A>(f: Predicate<A>) {
  return <R, E>(self: C.Stream<R, E, A>) => dropUntil_(self, f)
}
