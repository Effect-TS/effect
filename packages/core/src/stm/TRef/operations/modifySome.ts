import { Tuple } from "../../../collection/immutable/Tuple"
import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/XTRef modifySome
 */
export function modifySome_<E, A, B>(
  self: ETRef<E, A>,
  b: B,
  pf: (a: A) => Option<Tuple<[B, A]>>
): STM<unknown, E, B> {
  return self.modify((a) => pf(a).fold(Tuple(b, a), identity))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(b: B, pf: (a: A) => Option<Tuple<[B, A]>>) {
  return <E>(self: ETRef<E, A>): STM<unknown, E, B> => self.modifySome(b, pf)
}
