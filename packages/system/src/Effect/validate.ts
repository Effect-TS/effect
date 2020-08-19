import * as A from "../Array"
import * as NA from "../NonEmptyArray"

import { ExecutionStrategy, Parallel, ParallelN, Sequential } from "./ExecutionStrategy"
import { Effect } from "./effect"
import { validateExec_, validateParN_, validatePar_, validate_ } from "./validate_"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validate = <A, S, R, E, B>(f: (a: A) => Effect<S, R, E, B>) => (
  as: Iterable<A>
) => validate_(as, f)

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validatePar = <A, S, R, E, B>(f: (a: A) => Effect<S, R, E, B>) => (
  as: Iterable<A>
) => validatePar_(as, f)

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validateParN = (n: number) => <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => validateParN_(n)(as, f)

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateExec(
  es: Sequential
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<S, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec<S, R, E, A, B>(
  es: Parallel
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec<S, R, E, A, B>(
  es: ParallelN
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec<S, R, E, A, B>(
  es: ExecutionStrategy
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec<S, R, E, A, B>(
  es: ExecutionStrategy
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec<A, S, R, E, B>(
  es: ExecutionStrategy
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>> {
  return (f) => (as) => validateExec_(es, as, f)
}
