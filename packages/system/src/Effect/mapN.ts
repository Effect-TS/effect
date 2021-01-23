import type { NonEmptyArray } from "../NonEmptyArray"
import type { _E, _R } from "../Utils"
import type { Effect } from "./effect"
import { map_ } from "./map"
import type { TupleA } from "./tuple"
import { tuple, tuplePar, tupleParN } from "./tuple"

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 */
export function mapN<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B
): (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (t) => map_(tuple<T>(...t), f)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 */
export function mapNPar<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B
): (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (t) => map_(tuplePar<T>(...t), f)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 */
export function mapNParN(
  n: number
): <T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B
) => (t: T) => Effect<_R<T[number]>, _E<T[number]>, B> {
  return (f) => (t) => map_(tupleParN(n)(...t), f)
}
