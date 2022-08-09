/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus static effect/core/stm/TArray.Aspects collectFirstSTM
 * @tsplus pipeable effect/core/stm/TArray collectFirstSTM
 */
export function collectFirstSTM<A, E, B>(pf: (a: A) => Maybe<STM<never, E, B>>) {
  return (self: TArray<A>): STM<never, E, Maybe<B>> =>
    self
      .find((a) => pf(a).isSome())
      .flatMap((option) =>
        option.fold(
          STM.none,
          (a) =>
            pf(a)
              .map((stm) => stm.map(Maybe.some))
              .getOrElse(STM.none)
        )
      )
}
