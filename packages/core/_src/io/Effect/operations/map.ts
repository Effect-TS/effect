/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @tsplus fluent ets/Effect map
 */
export function map_<R, E, A, B>(
  self: Effect<R, E, A>,
  f: (a: A) => B,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return self.flatMap((a) => Effect.succeedNow(f(a)))
}

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @tsplus static ets/Effect/Aspects map
 */
export const map = Pipeable(map_)
