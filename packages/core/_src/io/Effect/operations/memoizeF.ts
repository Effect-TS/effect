/**
 * Returns a memoized version of the specified effectual function.
 *
 * @tsplus static ets/Effect/Ops memoize
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect.UIO<(a: A) => Effect<R, E, B>> {
  return SynchronizedRef.make(new Map<A, Deferred<E, B>>()).map(
    (ref) =>
      (a: A) =>
        ref.modifyEffect((map) => {
          const result = Maybe.fromNullable(map.get(a))
          return result.fold(
            Deferred.make<E, B>()
              .tap((deferred) => f(a).intoDeferred(deferred).fork())
              .map((deferred) => Tuple(deferred, map.set(a, deferred))),
            (deferred) => Effect.succeedNow(Tuple(deferred, map))
          )
        })
          .flatMap((deferred) => deferred.await())
  )
}
