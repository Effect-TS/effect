import { concreteXPure } from "@effect/core/io-light/Sync/definition";

/**
 * Provides this computation with its required environment.
 *
 * @tsplus fluent ets/Sync provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Sync<R, E, A>,
  env: LazyArg<Env<R>>
): Sync<unknown, E, A> {
  concreteXPure(self);
  return self.provideEnvironment(env);
}

/**
 * Provides this computation with its required environment.
 *
 * @tsplus static ets/Sync/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
