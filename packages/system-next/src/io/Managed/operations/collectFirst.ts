import type * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { none } from "./none"
import { some } from "./some"
import { succeed } from "./succeed"
import { suspend } from "./suspend"

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 */
export function collectFirst_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __trace?: string
): Managed<R, E, O.Option<B>> {
  return chain_(succeed(as[Symbol.iterator]), (iterator) => loop(iterator, f, __trace))
}

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 *
 * @ets_data_first collectFirst_
 */
export function collectFirst<R, E, A, B>(
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __trace?: string
) {
  return (as: Iterable<A>): Managed<R, E, O.Option<B>> => collectFirst_(as, f, __trace)
}

function loop<R, E, A, B>(
  iterator: Iterator<A>,
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __trace?: string
): Managed<R, E, O.Option<B>> {
  const next = iterator.next()
  if (next.done) {
    return none
  }
  return chain_(f(next.value), (o) =>
    o._tag === "None"
      ? suspend(() => loop(iterator, f, __trace))
      : some(o.value, __trace)
  )
}
