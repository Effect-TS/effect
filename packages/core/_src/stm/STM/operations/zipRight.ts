/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @tsplus operator ets/STM >
 * @tsplus fluent ets/STM zipRight
 */
export function zipRight_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, A1> {
  return self.zipWith(that, (_, b) => b);
}

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @tsplus static ets/STM/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
