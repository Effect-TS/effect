import type { NonEmptyArray } from "../NonEmptyArray"
import type { Effect } from "./effect"
import { map_ } from "./map_"
import type { TupleA, TupleE, TupleR } from "./tupled"
import { tuple, tuplePar, tupleParN } from "./tupled"

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 */
export function mapN<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B
): (t: T) => Effect<TupleR<T>, TupleE<T>, B> {
  return (t) => map_(tuple<T>(...t), f)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 */
export function mapNPar<T extends NonEmptyArray<Effect<any, any, any>>, B>(
  f: (_: TupleA<T>) => B
): (t: T) => Effect<TupleR<T>, TupleE<T>, B> {
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
) => (t: T) => Effect<TupleR<T>, TupleE<T>, B> {
  return (f) => (t) => map_(tupleParN(n)(...t), f)
}
