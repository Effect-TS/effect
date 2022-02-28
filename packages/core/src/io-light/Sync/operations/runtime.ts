import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Runs this computation returning either an error of type `E` or a success of
 * type `A`.
 *
 * @tsplus fluent ets/Sync runEither
 */
export function runEither<E, A>(self: Sync<unknown, E, A>): Either<E, A> {
  concreteXPure(self)
  return self.runEither()
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
  return self.provideEnvironment(r).runEither()
}

/**
 * Runs this computation returning either an error of type `E` or a success of
 * type `A`.
 *
 * @ets_data_first runEitherEnv_
 */
export function runEitherEnv<R>(r: LazyArg<R>) {
  return <E, A>(self: Sync<R, E, A>): Either<E, A> => self.runEitherEnv(r)
}

/**
 * Runs this non failable computation returning a success of type `A`.
 *
 * @tsplus fluent ets/Sync run
 */
export function run<A>(self: Sync<unknown, never, A>): A {
  concreteXPure(self)
  return self.run()
}
