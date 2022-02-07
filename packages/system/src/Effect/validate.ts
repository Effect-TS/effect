// ets_tracing: off

import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import * as E from "../Either/index.js"
import { absolve } from "./absolve.js"
import type { Effect } from "./effect.js"
import { either } from "./either.js"
import { forEach_, forEachExec_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import type { ExecutionStrategy } from "./ExecutionStrategy.js"
import { map_ } from "./map.js"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validate_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return absolve(
    map_(
      forEach_(as, (a) => either(f(a))),
      mergeExits<E, B>()
    ),
    __trace
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
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return absolve(
    map_(
      forEachPar_(as, (a) => either(f(a))),
      mergeExits<E, B>()
    ),
    __trace
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
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return absolve(
    map_(
      forEachParN_(as, n, (a) => either(f(a))),
      mergeExits<E, B>()
    ),
    __trace
  )
}

function mergeExits<E, B>(): (
  a: Chunk.Chunk<E.Either<E, B>>
) => E.Either<Chunk.Chunk<E>, Chunk.Chunk<B>> {
  return (exits) => {
    let errors = Chunk.empty<E>()
    let results = Chunk.empty<B>()

    for (const e of exits) {
      if (e._tag === "Left") {
        errors = Chunk.append_(errors, e.left)
      } else {
        results = Chunk.append_(results, e.right)
      }
    }

    if (!Chunk.isEmpty(errors)) {
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
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> {
  return absolve(
    map_(
      forEachExec_(as, es, (a) => either(f(a))),
      mergeExits<E, B>()
    ),
    __trace
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @ets_data_first validate_
 */
export function validate<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>) => validate_(as, f, __trace)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @ets_data_first validatePar_
 */
export function validatePar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => validatePar_(as, f, __trace)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @ets_data_first validateParN_
 */
export function validateParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => validateParN_(as, n, f, __trace)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @ets_data_first validateExec_
 */
export function validateExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> {
  return (as) => validateExec_(as, es, f, __trace)
}
