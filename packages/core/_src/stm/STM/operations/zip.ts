/**
 * Sequentially zips this value with the specified one.
 *
 * @tsplus fluent ets/STM zip
 */
export function zip_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, Tuple<[A, A1]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b));
}

/**
 * Sequentially zips this value with the specified one.
 *
 * @tsplus static ets/STM/Aspects zip
 */
export const zip = Pipeable(zip_);
