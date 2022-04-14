/**
 * Returns whether this effect is a success.
 *
 * @tsplus fluent ets/Effect isSuccess
 */
export function isSuccess<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect.RIO<R, boolean> {
  return self.fold(() => false, () => true);
}
