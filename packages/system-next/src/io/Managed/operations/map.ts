import { Tuple } from "../../../collection/immutable/Tuple"
import { Managed } from "../definition"

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @ets fluent ets/Managed map
 */
export function map_<R, E, A, B>(
  self: Managed<R, E, A>,
  f: (a: A) => B,
  __etsTrace?: string
): Managed<R, E, B> {
  return Managed(self.effect.map(({ tuple: [fin, a] }) => Tuple(fin, f(a))))
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B, __etsTrace?: string) {
  return <R, E>(self: Managed<R, E, A>) => map_(self, f)
}
