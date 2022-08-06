/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus fluent effect/core/stm/TArray collectFirstSTM
 */
export function collectFirstSTM_<A, E, B>(
  self: TArray<A>,
  pf: (a: A) => Maybe<STM<never, E, B>>
): STM<never, E, Maybe<B>> {
  return self
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

/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus static effect/core/stm/TArray.Aspects collectFirstSTM
 */
export const collectFirstSTM = Pipeable(collectFirstSTM_)
