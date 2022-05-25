/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/Effect orDieWith
 */
export function orDieWith_<R, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
): Effect.RIO<R, A> {
  return self.foldEffect((e) => Effect.dieNow(f(e)), Effect.succeedNow)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static ets/Effect/Aspects orDieWith
 */
export const orDieWith = Pipeable(orDieWith_)
