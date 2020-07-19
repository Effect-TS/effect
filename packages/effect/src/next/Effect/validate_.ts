import * as A from "../../Array"
import * as E from "../../Either"
import * as NA from "../../NonEmptyArray"

import { ExecutionStrategy, Sequential, Parallel, ParallelN } from "./ExecutionStrategy"
import { absolve } from "./absolve"
import { Effect } from "./effect"
import { either } from "./either"
import { foreachExec_ } from "./foreachExec_"
import { foreachParN_ } from "./foreachParN_"
import { foreachPar_ } from "./foreachPar_"
import { foreach_ } from "./foreach_"
import { map_ } from "./map_"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validate_ = <A, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
) =>
  absolve(
    map_(
      foreach_(as, (a) => either(f(a))),
      (exits) =>
        A.foldMap_(E.getValidationMonoid(NA.getSemigroup<E>(), A.getMonoid<B>()))(
          exits,
          (e) => (e._tag === "Left" ? E.left([e.left]) : E.right([e.right]))
        )
    )
  )

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validatePar_ = <A, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
) =>
  absolve(
    map_(
      foreachPar_(as, (a) => either(f(a))),
      (exits) =>
        A.foldMap_(E.getValidationMonoid(NA.getSemigroup<E>(), A.getMonoid<B>()))(
          exits,
          (e) => (e._tag === "Left" ? E.left([e.left]) : E.right([e.right]))
        )
    )
  )

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validateParN_ = (n: number) => <A, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
) =>
  absolve(
    map_(
      foreachParN_(n)(as, (a) => either(f(a))),
      (exits) =>
        A.foldMap_(E.getValidationMonoid(NA.getSemigroup<E>(), A.getMonoid<B>()))(
          exits,
          (e) => (e._tag === "Left" ? E.left([e.left]) : E.right([e.right]))
        )
    )
  )

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateExec_<S, R, E, A, B>(
  es: Sequential,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<S, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec_<S, R, E, A, B>(
  es: Parallel,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec_<S, R, E, A, B>(
  es: ParallelN,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec_<S, R, E, A, B>(
  es: ExecutionStrategy,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec_<S, R, E, A, B>(
  es: ExecutionStrategy,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>>
export function validateExec_<A, S, R, E, B>(
  es: ExecutionStrategy,
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, B>
): Effect<unknown, R, NA.NonEmptyArray<E>, A.Array<B>> {
  return absolve(
    map_(
      foreachExec_(es, as, (a) => either(f(a))),
      (exits) =>
        A.foldMap_(E.getValidationMonoid(NA.getSemigroup<E>(), A.getMonoid<B>()))(
          exits,
          (e) => (e._tag === "Left" ? E.left([e.left]) : E.right([e.right]))
        )
    )
  )
}
