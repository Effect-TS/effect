/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/Sync as
 */
export function as_<R, E, A, B>(self: Sync<R, E, A>, value: LazyArg<B>): Sync<R, E, B> {
  return self.map(value);
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static ets/Sync/Aspects as
 */
export const as = Pipeable(as_);
