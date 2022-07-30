/**
 * Collects the first element of the `Collection<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @tsplus static effect/core/io/Effect.Ops collectFirst
 */
export function collectFirst<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, Maybe<B>>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<B>> {
  return Effect.sync(as).flatMap((Collection) => loop(Collection[Symbol.iterator](), f))
}

function loop<R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, Maybe<B>>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<B>> {
  const next = iterator.next()
  return next.done
    ? Effect.none
    : f(next.value).flatMap((option) => option.fold(loop(iterator, f), (b) => Effect.some(b)))
}
