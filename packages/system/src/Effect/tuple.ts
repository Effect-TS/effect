// tracing: off

import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import * as Tp from "../Collections/Immutable/Tuple"
import { accessCallTrace } from "../Tracing"
import type { _E, _R, ForcedTuple } from "../Utils"
import type { Effect } from "./effect"
import { collectAll, collectAllPar, collectAllParN_ } from "./excl-forEach"
import { map_ } from "./map"

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 *
 * @trace call
 */
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAll(t, accessCallTrace()), (x) => Tp.tuple(...x)) as any
}

/**
 * Like sequenceT but parallel, same as `forEachPar` + `identity` with a tuple type
 *
 * @trace call
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAllPar(t, accessCallTrace()), (x) => Tp.tuple(...x)) as any
}

/**
 * Like sequenceTPar but uses at most n fibers concurrently,
 * same as `forEachParN` + `identity` with a tuple type
 */
export function tupleParN(n: number) {
  return (
    /**
     * @trace call
     */
    <T extends NonEmptyArray<Effect<any, any, any>>>(
      ...t: T
    ): Effect<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> =>
      map_(collectAllParN_(t, n, accessCallTrace()), (x) => Tp.tuple(...x)) as any
  )
}
