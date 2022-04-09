import { concreteXPure } from "@effect/core/io-light/Sync/definition";

/**
 * Runs this computation returning either an error of type `E` or a success of
 * type `A`.
 *
 * @tsplus fluent ets/Sync runEither
 */
export function runEither<E, A>(self: Sync<unknown, E, A>): Either<E, A> {
  concreteXPure(self);
  return self.runEither();
}

/**
 * Runs this computation returning either an error of type `E` or a success of
 * type `A`.
 *
 * @tsplus fluent ets/Sync runEitherEnv
 */
export function runEitherEnv_<R, E, A>(
  self: Sync<R, E, A>,
  r: LazyArg<R>
): Either<E, A> {
  return self.provideEnvironment(r).runEither();
}

/**
 * Runs this computation returning either an error of type `E` or a success of
 * type `A`.
 *
 * @tsplus static ets/Sync/Aspects runEitherEnv
 */
export const runEitherEnv = Pipeable(runEitherEnv_);

/**
 * Runs this non failable computation returning a success of type `A`.
 *
 * @tsplus fluent ets/Sync run
 */
export function run<A>(self: Sync<unknown, never, A>): A {
  concreteXPure(self);
  return self.run();
}
