import * as X from "@effect-ts/system/XPure"

import type { Either } from "../../Classic/Either"
import { flow } from "../../Function"

export interface XEffect<R, E, A> extends X.XPure<unknown, unknown, R, E, A> {}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, R1, E1, B>(
  f: (a: A) => XEffect<R1, E1, B>
) => <R, E>(self: XEffect<R, E, A>) => XEffect<R & R1, E1 | E, B> = X.chain

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain_: <R, E, A, R1, E1, B>(
  self: XEffect<R, E, A>,
  f: (a: A) => XEffect<R1, E1, B>
) => XEffect<R & R1, E | E1, B> = X.chain_

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, R1, E1>(
  f: (a: A) => XEffect<R1, E1, any>
) => <S1, R, E>(self: XEffect<R, E, A>) => XEffect<R & R1, E1 | E, A> = X.tap

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap_: <R, E, A, R1, E1>(
  self: XEffect<R, E, A>,
  f: (a: A) => XEffect<R1, E1, any>
) => XEffect<R & R1, E | E1, A> = X.tap_

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export const succeed = <A>(a: A): XEffect<unknown, never, A> => X.succeed(() => a)

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export const fail: <E>(a: E) => XEffect<unknown, E, never> = X.fail

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const map_: <R, E, A, B>(
  self: XEffect<R, E, A>,
  f: (a: A) => B
) => XEffect<R, E, B> = X.map_

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const map: <A, B>(
  f: (a: A) => B
) => <R, E>(self: XEffect<R, E, A>) => XEffect<R, E, B> = X.map

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 */
export const foldM_: <R, E, A, R1, E1, B, R2, E2, C>(
  self: XEffect<R, E, A>,
  failure: (e: E) => XEffect<R1, E1, B>,
  success: (a: A) => XEffect<R2, E2, C>
) => XEffect<R & R1 & R2, E1 | E2, B | C> = X.foldM_

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 */
export const foldM: <E, A, R1, E1, B, R2, E2, C>(
  failure: (e: E) => XEffect<R1, E1, B>,
  success: (a: A) => XEffect<R2, E2, C>
) => <R>(self: XEffect<R, E, A>) => XEffect<R & R1 & R2, E1 | E2, B | C> = X.foldM

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or righr function passed to `fold`.
 */
export const fold: <E, A, B, C>(
  failure: (e: E) => B,
  success: (a: A) => C
) => <R>(self: XEffect<R, E, A>) => XEffect<R, never, B | C> = X.fold

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or righr function passed to `fold`.
 */
export const fold_: <R, E, A, B, C>(
  self: XEffect<R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => C
) => XEffect<R, never, B | C> = X.fold_

/**
 * Recovers from all errors.
 */
export const catchAll: <S1, E, S3, R1, E1, B>(
  failure: (e: E) => XEffect<R1, E1, B>
) => <R, A>(self: XEffect<R, E, A>) => XEffect<R & R1, E1, B | A> = X.catchAll

/**
 * Recovers from all errors.
 */
export const catchAll_: <R, E, A, R1, E1, B>(
  self: XEffect<R, E, A>,
  failure: (e: E) => XEffect<R1, E1, B>
) => XEffect<R & R1, E1, A | B> = X.catchAll_

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 */
export const bimap: <E, A, E1, A1>(
  f: (e: E) => E1,
  g: (a: A) => A1
) => <R>(self: XEffect<R, E, A>) => XEffect<R, E1, A1> = X.bimap

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 */
export const bimap_: <R, E, A, E1, A1>(
  self: XEffect<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
) => XEffect<R, E1, A1> = X.bimap_

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export const mapError: <E, E1>(
  f: (e: E) => E1
) => <R, A>(self: XEffect<R, E, A>) => XEffect<R, E1, A> = X.mapError

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export const mapError_: <R, E, A, E1>(
  self: XEffect<R, E, A>,
  f: (e: E) => E1
) => XEffect<R, E1, A> = X.mapError_

/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 */
export const unit = succeed<void>(undefined)

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 */
export const provideSome: <R0, R1>(
  f: (s: R0) => R1
) => <E, A>(self: XEffect<R1, E, A>) => XEffect<R0, E, A> = X.provideSome

/**
 * Provides this computation with its required environment.
 */
export const provideAll: <R>(
  r: R
) => <E, A>(self: XEffect<R, E, A>) => XEffect<unknown, E, A> = X.provideAll

/**
 * Access the environment monadically
 */
export const accessM: <R, R1, E, A>(
  f: (_: R) => XEffect<R1, E, A>
) => XEffect<R1 & R, E, A> = X.accessM

/**
 * Access the environment with the function f
 */
export const access: <R, A>(f: (_: R) => A) => XEffect<R, never, A> = X.access

/**
 * Access the environment
 */
export const environment = <R>(): XEffect<R, never, R> => X.environment<R>()()

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 */
export const either: <R, E, A>(
  self: XEffect<R, E, A>
) => XEffect<R, never, Either<E, A>> = X.either

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 */
export const orElseEither: <R2, E2, A2>(
  that: XEffect<R2, E2, A2>
) => <R, E, A>(self: XEffect<R, E, A>) => XEffect<R & R2, E2, Either<A, A2>> =
  X.orElseEither

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 */
export const orElseEither_: <R, E, A, R2, E2, A2>(
  self: XEffect<R, E, A>,
  that: XEffect<R2, E2, A2>
) => XEffect<R & R2, E2, Either<A, A2>> = X.orElseEither_

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 */
export const zipWith: <R1, E1, A, B, C>(
  that: XEffect<R1, E1, B>,
  f: (a: A, b: B) => C
) => <R, E>(self: XEffect<R, E, A>) => XEffect<R & R1, E1 | E, C> = X.zipWith

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 */
export const zipWith_: <R, E, A, R1, E1, B, C>(
  self: XEffect<R, E, A>,
  that: XEffect<R1, E1, B>,
  f: (a: A, b: B) => C
) => XEffect<R & R1, E | E1, C> = X.zipWith_

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 */
export const zip: <R1, E1, B>(
  that: XEffect<R1, E1, B>
) => <R, E, A>(self: XEffect<R, E, A>) => XEffect<R & R1, E1 | E, readonly [A, B]> =
  X.zip

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 */
export const zip_: <R, E, A, S3, R1, E1, B>(
  self: XEffect<R, E, A>,
  that: XEffect<R1, E1, B>
) => XEffect<R & R1, E | E1, readonly [A, B]> = X.zip_

/**
 * Suspend a computation, useful in recursion
 */
export const suspend: <R, E, A>(f: () => XEffect<R, E, A>) => XEffect<R, E, A> =
  X.suspend

/**
 * Lift a sync (non failable) computation
 */
export const sync: <A>(f: () => A) => XEffect<unknown, never, A> = X.sync

/**
 * Lift a sync (non failable) computation
 */
export const tryCatch: <E>(
  onThrow: (u: unknown) => E
) => <A>(f: () => A) => XEffect<unknown, E, A> = X.tryCatch

/**
 * Runs this computation returning either an error of type E or a success of type A
 */
export const runEither: <E, A>(self: XEffect<unknown, E, A>) => Either<E, A> =
  X.runEither

/**
 * Runs this computation returning either an error of type E or a success of type A
 */
export const runEitherEnv: <R>(
  r: R
) => <E, A>(self: XEffect<R, E, A>) => Either<E, A> = (r) =>
  flow(provideAll(r), runEither)

/**
 * Runs this non failable computation returning a success of type A
 */
export const run: <A>(self: XEffect<unknown, never, A>) => A = X.runIO
