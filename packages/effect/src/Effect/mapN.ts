import type { NonEmptyArray } from "../NonEmptyArray"
import type { Effect } from "./effect"
import { map_ } from "./map_"
import type { TupledA, TupledE, TupledR, TupledS } from "./tupled"
import { tupled, tupledPar, tupledParN } from "./tupled"

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 */
export function mapN<T extends NonEmptyArray<Effect<any, any, any, any>>, B>(
  f: (_: TupledA<T>) => B
): (t: T) => Effect<TupledS<T>, TupledR<T>, TupledE<T>, B> {
  return (t) => map_(tupled<T>(...t), f)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 */
export function mapNPar<T extends NonEmptyArray<Effect<any, any, any, any>>, B>(
  f: (_: TupledA<T>) => B
): (t: T) => Effect<unknown, TupledR<T>, TupledE<T>, B> {
  return (t) => map_(tupledPar<T>(...t), f)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 */
export function mapNParN(
  n: number
): <T extends NonEmptyArray<Effect<any, any, any, any>>, B>(
  f: (_: TupledA<T>) => B
) => (t: T) => Effect<unknown, TupledR<T>, TupledE<T>, B> {
  return (f) => (t) => map_(tupledParN(n)(...t), f)
}
