import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @tsplus fluent ets/Sync foldSync
 */
export function foldSync_<R, E, A, R1, E1, B, R2, E2, C>(
  self: Sync<R, E, A>,
  failure: (e: E) => Sync<R1, E1, B>,
  success: (a: A) => Sync<R2, E2, C>
): Sync<R & R1 & R2, E1 | E2, B | C> {
  concreteXPure(self);
  return self.foldXPure(failure, success);
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @tsplus static ets/Sync/Aspects foldSync
 */
export const foldSync = Pipeable(foldSync_);
