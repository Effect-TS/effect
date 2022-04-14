/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @tsplus fluent ets/Effect memoize
 */
export function memoize<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect.UIO<Effect<R, E, A>> {
  return Effect.Do()
    .bind("deferred", () => Deferred.make<E, A>())
    .bind("complete", ({ deferred }) => self.intoDeferred(deferred).once())
    .map(({ complete, deferred }) => complete > deferred.await());
}
