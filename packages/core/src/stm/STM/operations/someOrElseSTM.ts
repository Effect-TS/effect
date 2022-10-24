import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrElseSTM
 * @tsplus pipeable effect/core/stm/STM someOrElseSTM
 * @category getters
 * @since 1.0.0
 */
export function someOrElseSTM<R2, E2, B>(orElse: LazyArg<STM<R2, E2, B>>) {
  return <R, E, A>(self: STM<R, E, Option.Option<A>>): STM<R | R2, E | E2, A | B> =>
    (self as STM<R, E, Option.Option<A | B>>).flatMap((option) => {
      const maybeValue = pipe(option, Option.map(STM.succeed))
      return maybeValue._tag === "Some" ? maybeValue.value : orElse()
    })
}
