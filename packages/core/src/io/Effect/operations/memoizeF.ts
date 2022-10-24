/**
 * Returns a memoized version of the specified effectual function.
 *
 * @tsplus static effect/core/io/Effect.Ops memoize
 * @category constructors
 * @since 1.0.0
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
): Effect<never, never, (a: A) => Effect<R, E, B>> {
  return Ref.Synchronized.make(new Map<A, Deferred<E, B>>()).map(
    (ref) =>
      (a: A) =>
        ref.modifyEffect((map) => {
          const result = map.get(a)
          if (result == null) {
            return Deferred.make<E, B>()
              .tap((deferred) => f(a).intoDeferred(deferred).fork)
              .map((deferred) => [deferred, map.set(a, deferred)] as const)
          }
          return Effect.succeed([result, map] as const)
        }).flatMap((deferred) => deferred.await)
  )
}
