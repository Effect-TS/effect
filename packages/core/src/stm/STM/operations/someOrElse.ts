import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrElse
 * @tsplus pipeable effect/core/stm/STM someOrElse
 * @category getters
 * @since 1.0.0
 */
export function someOrElse<B>(orElse: LazyArg<B>) {
  return <R, E, A>(self: STM<R, E, Option<A>>): STM<R, E, A | B> =>
    self.map((option) => option._tag === "Some" ? option.value : orElse())
}
