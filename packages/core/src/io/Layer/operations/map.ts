import { Layer } from "../definition"

/**
 * Returns a new layer whose output is mapped by the specified function.
 *
 * @tsplus fluent ets/Layer map
 */
export function map_<R, E, A, B>(self: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return self.flatMap((a) => Layer.succeed(f(a)))
}

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export const map = Pipeable(map_)
