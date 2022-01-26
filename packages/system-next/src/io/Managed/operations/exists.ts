import { Managed } from "../definition"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets static ets/ManagedOps exists
 */
export function exists_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
): Managed<R, E, boolean> {
  return Managed.succeed(as[Symbol.iterator]).flatMap((iterator) => loop(iterator, f))
}

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets_data_first exists_
 */
export function exists<R, E, A>(
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Managed<R, E, boolean> => exists_(as, f)
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
    b ? Managed.succeedNow(b) : Managed.suspend(loop(iterator, f))
  )
}
