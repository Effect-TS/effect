/**
 * Returns whether this effect is a failure.
 *
 * @tsplus fluent ets/Effect isFailure
 */
export function isFailure<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, never, boolean> {
  return self.fold(() => true, () => false)
}
