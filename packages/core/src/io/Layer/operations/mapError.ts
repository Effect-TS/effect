import { Layer } from "../definition"

/**
 * Returns a layer with its error channel mapped using the specified function.
 *
 * @tsplus fluent ets/Layer mapError
 */
export function mapError_<R, E, E1, A>(
  self: Layer<R, E, A>,
  f: (e: E) => E1
): Layer<R, E1, A> {
  return self.catchAll((e) => Layer.fail(f(e)))
}

/**
 * Returns a layer with its error channel mapped using the specified function.
 */
export const mapError = Pipeable(mapError_)
