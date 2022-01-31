// ets_tracing: off

import type { NonEmptyArray } from "../../Collections/Immutable/NonEmptyArray/index.js"
import type { Tuple } from "../../Collections/Immutable/Tuple/index.js"
import type { _A, _E, _R, ForcedArray } from "../../Utils/index.js"
import { map_ } from "../core.js"
import type { Managed } from "../managed.js"
import { tuple, tuplePar, tupleParN } from "../tuple.js"

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 *
 * @ets_data_first mapN_
 */
export function mapN<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): (t: Tuple<T>) => Managed<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapN_(t, f, __trace)
}

/**
 * Sequentially zips the specified effects using the specified combiner
 * function.
 */
export function mapN_<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  t: Tuple<T>,
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): Managed<_R<T[number]>, _E<T[number]>, B> {
  // @ts-expect-error
  return map_(tuple<T>(...t.tuple), (x) => f(...x), __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * @ets_data_first mapNPar_
 */
export function mapNPar<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): (t: Tuple<T>) => Managed<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapNPar_(t, f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 */
export function mapNPar_<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  t: Tuple<T>,
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): Managed<_R<T[number]>, _E<T[number]>, B> {
  // @ts-expect-error
  return map_(tuplePar<T>(...t.tuple), (x) => f(...x.tuple), __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 *
 * @dataFitst mapNParN_
 */
export function mapNParN<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  n: number,
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): (t: Tuple<T>) => Managed<_R<T[number]>, _E<T[number]>, B> {
  return (t) => mapNParN_(t, n, f, __trace)
}

/**
 * Zips the specified effects in parallel using the specified combiner
 * function.
 *
 * This variant uses up to N fibers.
 */
export function mapNParN_<T extends NonEmptyArray<Managed<any, any, any>>, B>(
  t: Tuple<T>,
  n: number,
  f: (..._: ForcedArray<{ [k in keyof T]: _A<T[k]> }>) => B,
  __trace?: string
): Managed<_R<T[number]>, _E<T[number]>, B> {
  // @ts-expect-error
  return map_(tupleParN(n)(...t.tuple), (x) => f(...x.tuple), __trace)
}
