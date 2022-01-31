import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static ets/EffectOps forall
 */
export function forall_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  return chain_(succeed(as[Symbol.iterator]), (iterator) => loop(iterator, f))
}

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets_data_first forall_
 */
export function forall<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, boolean> => forall_(as, f, __etsTrace)
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return succeedNow(false)
  }
  return chain_(f(next.value), (b) =>
    b ? suspendSucceed(() => loop(iterator, f)) : succeedNow(b)
  )
}
