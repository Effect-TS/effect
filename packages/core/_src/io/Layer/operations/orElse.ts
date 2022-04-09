/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @tsplus operator ets/Layer |
 * @tsplus fluent ets/Layer orElse
 */
export function orElse_<R, E, A, R1, E1, A1>(
  self: Layer<R, E, A>,
  that: LazyArg<Layer<R1, E1, A1>>
): Layer<R & R1, E | E1, A | A1> {
  return self.catchAll(that);
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @tsplus static ets/Layer/Aspects orElse
 */
export const orElse = Pipeable(orElse_);
