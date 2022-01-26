import type * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 *
 * @ets static ets/ManagedOps collectFirst
 */
export function collectFirst_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __etsTrace?: string
): Managed<R, E, O.Option<B>> {
  return Managed.succeed(as[Symbol.iterator]).flatMap((iterator) => loop(iterator, f))
}

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 *
 * @ets_data_first collectFirst_
 */
export function collectFirst<R, E, A, B>(
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Managed<R, E, O.Option<B>> => collectFirst_(as, f)
}

function loop<R, E, A, B>(
  iterator: Iterator<A>,
  f: (a: A) => Managed<R, E, O.Option<B>>,
  __etsTrace?: string
): Managed<R, E, O.Option<B>> {
  const next = iterator.next()
  if (next.done) {
    return Managed.none
  }
  return f(next.value).flatMap((o) =>
    o._tag === "None" ? Managed.suspend(() => loop(iterator, f)) : Managed.some(o.value)
  )
}
