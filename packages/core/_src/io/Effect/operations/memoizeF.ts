/**
 * Returns a memoized version of the specified effectual function.
 *
 * @tsplus static effect/core/io/Effect.Ops memoize
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
): Effect<never, never, (a: A) => Effect<R, E, B>> {
  return Ref.Synchronized.make(new Map<A, Deferred<E, B>>()).map(
    (ref) =>
      (a: A) =>
        ref.modifyEffect((map) => {
          const result = Maybe.fromNullable(map.get(a))
          return result.fold(
            Deferred.make<E, B>()
              .tap((deferred) => f(a).intoDeferred(deferred).fork)
              .map((deferred) => [deferred, map.set(a, deferred)] as const),
            (deferred) => Effect.succeed([deferred, map] as const)
          )
        })
          .flatMap((deferred) => deferred.await)
  )
}
