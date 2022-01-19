import type { Layer } from "../definition"
import { catchAll_ } from "./catchAll"
import { fail } from "./fail"

/**
 * Returns a layer with its error channel mapped using the specified function.
 */
export function mapError_<R, E, E1, A>(
  self: Layer<R, E, A>,
  f: (e: E) => E1
): Layer<R, E1, A> {
  return catchAll_(self, (e) => fail(f(e)))
}

/**
 * Returns a layer with its error channel mapped using the specified function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Layer<R, E, A>): Layer<R, E1, A> => mapError_(self, f)
}
