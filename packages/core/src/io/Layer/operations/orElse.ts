/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @tsplus pipeable-operator effect/core/io/Layer |
 * @tsplus static effect/core/io/Layer.Aspects orElse
 * @tsplus pipeable effect/core/io/Layer orElse
 * @category alternatives
 * @since 1.0.0
 */
export function orElse<R1, E1, A1>(that: LazyArg<Layer<R1, E1, A1>>) {
  return <R, E, A>(self: Layer<R, E, A>): Layer<R | R1, E | E1, A & A1> => self.catchAll(that)
}
