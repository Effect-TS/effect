/**
 * Returns a transactional effect that will produce the value of this effect
 * in left side, unless it fails or retries, in which case, it will produce
 * the value of the specified effect in right side.
 *
 * @tsplus fluent ets/STM orElseEither
 */
export function orElseEither_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, B>>
): STM<R & R1, E | E1, Either<A, B>> {
  return self.map(Either.left) | that().map(Either.right)
}

/**
 * Returns a transactional effect that will produce the value of this effect
 * in left side, unless it fails or retries, in which case, it will produce
 * the value of the specified effect in right side.
 *
 * @tsplus static ets/STM/Aspects orElseEither
 */
export const orElseEither = Pipeable(orElseEither_)
