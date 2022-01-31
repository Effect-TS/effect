import { Effect } from "../definition"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @tsplus fluent ets/Effect map
 */
export function map_<R, E, A, B>(
  self: Effect<R, E, A>,
  f: (a: A) => B,
  __etsTrace?: string
): Effect<R, E, B> {
  return self.flatMap((a) => Effect.succeedNow(f(a)))
}

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B, __etsTrace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, B> => map_(self, f)
}
