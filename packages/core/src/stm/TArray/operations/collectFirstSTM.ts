import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus static effect/core/stm/TArray.Aspects collectFirstSTM
 * @tsplus pipeable effect/core/stm/TArray collectFirstSTM
 * @category elements
 * @since 1.0.0
 */
export function collectFirstSTM<A, E, B>(pf: (a: A) => Option.Option<STM<never, E, B>>) {
  return (self: TArray<A>): STM<never, E, Option.Option<B>> =>
    self
      .find((a) => Option.isSome(pf(a)))
      .flatMap((option) => {
        switch (option._tag) {
          case "None": {
            return STM.none
          }
          case "Some": {
            return pipe(
              pf(option.value),
              Option.map((stm) => stm.map(Option.some)),
              Option.getOrElse(STM.none)
            )
          }
        }
      })
}
