/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus fluent ets/Effect zip
 */
export function zip_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.flatMap((a) => that().map((b) => Tuple(a, b)))
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static ets/Effect/Aspects zip
 */
export const zip = Pipeable(zip_)
