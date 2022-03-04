import type { Lazy, LazyArg } from "../../../data/Function"
import { STM, STMEffect } from "../definition"
import { prepareResetJournal } from "../Journal"

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @tsplus operator ets/STM |
 * @tsplus fluent ets/STM orElse
 */
export function orElse_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, A | A1> {
  return (
    new STMEffect((journal) => prepareResetJournal(journal)) as STM<
      unknown,
      never,
      Lazy<unknown>
    >
  ).flatMap((reset) =>
    self
      .orTry(STM.succeed(reset()) > that)
      .catchAll(() => STM.succeed(reset()) > that())
  )
}

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @ets_data_first orElse_
 */
export function orElse<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R1, E | E1, A | A1> => self | that
}
