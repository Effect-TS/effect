/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @tsplus getter effect/core/io/Effect once
 * @category mutations
 * @since 1.0.0
 */
export function once<R, E, A>(self: Effect<R, E, A>): Effect<never, never, Effect<R, E, void>> {
  return Ref.make(true).map((ref) => Effect.whenEffect(ref.getAndSet(false), self).unit)
}
