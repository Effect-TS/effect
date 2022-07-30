/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @tsplus getter effect/core/io/Effect memoize
 */
export function memoize<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<never, never, Effect<R, E, A>> {
  return Do(($) => {
    const deferred = $(Deferred.make<E, A>())
    const complete = $(self.intoDeferred(deferred).once)
    return complete.zipRight(deferred.await)
  })
}
