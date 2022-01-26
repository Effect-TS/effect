import { Effect } from "../definition"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets static ets/EffectOps exists
 */
export function exists_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  return Effect.succeed(as[Symbol.iterator]).flatMap((iterator) => loop(iterator, f))
}

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets_data_first exists_
 */
export function exists<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, boolean> => exists_(as, f)
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return Effect.succeedNow(false)
  }
  return f(next.value).flatMap((b) =>
    b ? Effect.succeedNow(b) : Effect.suspendSucceed(() => loop(iterator, f))
  )
}
