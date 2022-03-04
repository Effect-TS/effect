import { Option } from "../../../data/Option"
import { STM } from "../../STM"
import type { TArray } from "../definition"

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
 * @ets_data_first collectFirstSTM_
 */
export function collectFirstSTM<A, E, B>(pf: (a: A) => Option<STM<unknown, E, B>>) {
  return (self: TArray<A>): STM<unknown, E, Option<B>> => self.collectFirstSTM(pf)
}
