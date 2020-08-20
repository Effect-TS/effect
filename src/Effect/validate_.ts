import * as A from "../Array"
import * as E from "../Either"
import type * as NA from "../NonEmptyArray"
import { absolve } from "./absolve"
import type { Effect } from "./effect"
import { either } from "./either"
import type {
  ExecutionStrategy,
  Parallel,
  ParallelN,
  Sequential
} from "./ExecutionStrategy"
import { foreach_ } from "./foreach_"
import { foreachExec_ } from "./foreachExec_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"
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
      mergeExits<E, B>()
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
      mergeExits<E, B>()
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
      mergeExits<E, B>()
    )
  )

function mergeExits<E, B>(): (
  a: readonly E.Either<E, B>[]
) => E.Either<NA.NonEmptyArray<E>, B[]> {
  return (exits) => {
    const errors = [] as E[]
    const results = [] as B[]

    exits.forEach((e) => {
      if (e._tag === "Left") {
        errors.push(e.left)
      } else {
        results.push(e.right)
      }
    })

    if (A.isNonEmpty(errors)) {
      return E.left(errors)
    } else {
      return E.right(results)
    }
  }
}

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
      mergeExits<E, B>()
    )
  )
}
