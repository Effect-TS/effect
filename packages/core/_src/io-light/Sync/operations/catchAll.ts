import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Sync catchAll
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  f: (e: E) => Sync<R1, E1, B>
): Sync<R & R1, E1, A | B> {
  concreteXPure(self);
  return self.catchAll(f);
}

/**
 * Recovers from all errors.
 *
 * @tsplus static ets/Sync/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_);
