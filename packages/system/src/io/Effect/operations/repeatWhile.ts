import type { Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhile
 */
export function repeatWhile_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.repeatWhileEffect((a) => Effect.succeed(f(a)))
}

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @ets_data_first repeatWhile_
 */
export function repeatWhile<A>(f: Predicate<A>, __etsTrace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => self.repeatWhile(f)
}
