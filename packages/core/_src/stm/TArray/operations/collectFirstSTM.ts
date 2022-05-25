/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus fluent ets/TArray collectFirstSTM
 */
export function collectFirstSTM_<A, E, B>(
  self: TArray<A>,
  pf: (a: A) => Option<STM<unknown, E, B>>
): STM<unknown, E, Option<B>> {
  return self
    .find((a) => pf(a).isSome())
    .flatMap((option) =>
      option.fold(
        (): STM<unknown, E, Option<B>> => STM.none,
        (a) =>
          pf(a)
            .map((stm) => stm.map(Option.some))
            .getOrElse(STM.none)
      )
    )
}

/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @tsplus static ets/TArray/Aspects collectFirstSTM
 */
export const collectFirstSTM = Pipeable(collectFirstSTM_)
