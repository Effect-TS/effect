import { concreteXPure } from "@effect/core/io-light/Sync/definition";

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @tsplus fluent ets/Sync provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R1, E, A>(
  self: Sync<R1, E, A>,
  f: (r: Env<R0>) => Env<R1>
): Sync<R0, E, A> {
  concreteXPure(self);
  return self.provideSomeEnvironment(f);
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @tsplus static ets/Sync/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
