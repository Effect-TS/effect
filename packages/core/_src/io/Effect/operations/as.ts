/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/Effect as
 */
export function as_<R, E, A, B>(
  self: Effect<R, E, A>,
  value: LazyArg<B>,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return self.map(value)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static ets/Effect/Aspects as
 */
export const as = Pipeable(as_)
