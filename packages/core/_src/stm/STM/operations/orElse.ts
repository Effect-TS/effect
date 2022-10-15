import { prepareResetJournal, STMEffect } from "@effect/core/stm/STM/definition/primitives"

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @tsplus pipeable-operator effect/core/stm/STM |
 * @tsplus static effect/core/stm/STM.Aspects orElse
 * @tsplus pipeable effect/core/stm/STM orElse
 */
export function orElse<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A | A1> =>
    (new STMEffect((journal) => prepareResetJournal(journal)) as STM<never, never, Lazy<unknown>>)
      .flatMap((reset) =>
        self
          .orTry(STM.sync(reset()).zipRight(that()))
          .catchAll(() => STM.sync(reset()).zipRight(that()))
      )
}
