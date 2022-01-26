import { Managed } from "../definition"

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate `f`.
 *
 * @ets static ets/ManagedOps forall
 */
export function forall_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
): Managed<R, E, boolean> {
  return Managed.succeed(as[Symbol.iterator]).flatMap((iterator) => loop(iterator, f))
}

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate `f`.
 *
 * @ets_data_first forall_
 */
export function forall<R, E, A>(
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Managed<R, E, boolean> => forall_(as, f)
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
): Managed<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return Managed.succeedNow(false)
  }
  return f(next.value).flatMap((b) =>
    b ? Managed.suspend(loop(iterator, f)) : Managed.succeedNow(b)
  )
}
