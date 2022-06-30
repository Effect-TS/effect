/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @tsplus getter effect/core/io/Effect merge
 */
export function merge<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, never, E | A> {
  return self.foldEffect((e) => Effect.succeedNow(e), Effect.succeedNow)
}
