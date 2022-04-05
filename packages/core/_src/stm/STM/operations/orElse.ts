import { STMEffect } from "@effect-ts/core/stm/STM/definition/primitives";
import { prepareResetJournal } from "@effect-ts/core/stm/STM/Journal";

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
      .orTry(STM.succeed(reset()) > that())
      .catchAll(() => STM.succeed(reset()) > that())
  );
}

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @tsplus static ets/STM/Aspects orElse
 */
export const orElse = Pipeable(orElse_);
