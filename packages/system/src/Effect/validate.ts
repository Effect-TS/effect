// tracing: off

import * as A from "../Array"
import * as E from "../Either"
import type * as NA from "../NonEmptyArray"
import { absolve } from "./absolve"
import type { Effect } from "./effect"
import { either } from "./either"
import { forEach_, forEachExec_, forEachPar_, forEachParN_ } from "./excl-forEach"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import { map_ } from "./map"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validate_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) {
  return absolve(
    map_(
      forEach_(as, (a) => either(f(a))),
      mergeExits<E, B>()
    )
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validatePar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
) {
  return absolve(
    map_(
      forEachPar_(as, (a) => either(f(a))),
      mergeExits<E, B>()
    )
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateParN_<A, R, E, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
) {
  return absolve(
    map_(
      forEachParN_(as, n, (a) => either(f(a))),
      mergeExits<E, B>()
    )
  )
}

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
export function validateExec_<A, R, E, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>
): Effect<R, NA.NonEmptyArray<E>, A.Array<B>> {
  return absolve(
    map_(
      forEachExec_(as, es, (a) => either(f(a))),
      mergeExits<E, B>()
    )
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @dataFirst validate_
 */
export function validate<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => validate_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @dataFirst validatePar_
 */
export function validatePar<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => validatePar_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @dataFirst validateParN_
 */
export function validateParN<A, R, E, B>(n: number, f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => validateParN_(as, n, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @dataFirst validateExec_
 */
export function validateExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>
): (as: Iterable<A>) => Effect<R, NA.NonEmptyArray<E>, A.Array<B>> {
  return (as) => validateExec_(as, es, f)
}
