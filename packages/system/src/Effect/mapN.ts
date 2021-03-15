// tracing: off

import type { NonEmptyArray } from "../NonEmptyArray"
import type { _E, _R } from "../Utils"
import type { Effect } from "./effect"
import { map_ } from "./map"
import type { TupleA } from "./tuple"
import { tuple, tuplePar, tupleParN } from "./tuple"

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 *
 * @dataFirst mapN_
 */
export function mapN<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B,
  __trace?: string
): (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapN_(t, f, __trace)
}

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 */
export function mapN_<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  t: T,
  f: (_: TupleA<T>) => B,
  __trace?: string
): Effect<_R<T[number]>, _E<T[number]>, B> {
  return map_(tuple<T>(...t), f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * @dataFirst mapNPar_
 */
export function mapNPar<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B,
  __trace?: string
): (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapNPar_(t, f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 */
export function mapNPar_<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  t: T,
  f: (_: TupleA<T>) => B,
  __trace?: string
): Effect<_R<T[number]>, _E<T[number]>, B> {
  return map_(tuplePar<T>(...t), f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 */
export function mapNParN<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  n: number,
  f: (_: TupleA<T>) => B,
  __trace?: string
): (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapNParN_(t, n, f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 */
export function mapNParN_<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  t: T,
  n: number,
  f: (_: TupleA<T>) => B,
  __trace?: string
): Effect<_R<T[number]>, _E<T[number]>, B> {
  return map_(tupleParN(n)(...t), f, __trace)
}
