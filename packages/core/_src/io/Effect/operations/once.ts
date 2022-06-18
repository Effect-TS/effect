/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @tsplus fluent ets/Effect once
 */
export function once<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<never, never, Effect<R, E, void>> {
  return Ref.make(true).map((ref) => Effect.whenEffect(ref.getAndSet(false), self).unit())
}
