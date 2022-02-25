import { Effect } from "../definition"

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @tsplus fluent ets/Effect flip
 */
export function flip<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, A, E> {
  return self.foldEffect(Effect.succeedNow, Effect.failNow)
}
