import { Managed } from "../definition"

/**
 * Returns a `Managed` that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 *
 * @tsplus fluent ets/Managed eventually
 */
export function eventually<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, A> {
  return Managed(self.effect.eventually())
}
