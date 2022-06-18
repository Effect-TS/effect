/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @tsplus fluent ets/Effect ignore
 */
export function ignore<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, never, void> {
  return self.fold(() => undefined, () => undefined)
}
