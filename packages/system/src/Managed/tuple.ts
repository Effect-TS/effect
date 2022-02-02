// ets_tracing: off

import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import * as Tp from "../Collections/Immutable/Tuple"
import { accessCallTrace } from "../Tracing"
import type { _E, _R, ForcedTuple } from "../Utils"
import { map_ } from "./core"
import type { Managed } from "./managed"
import { collectAll, collectAllPar, collectAllParN_ } from "./methods/api"

export type TupleA<T extends NonEmptyArray<Managed<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 *
 * @ets_trace call
 */
export function tuple<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  const trace = accessCallTrace()
  return map_(collectAll(t, trace), (x) => Tp.tuple(...x)) as any
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAllPar(t), (x) => Tp.tuple(...x)) as any
}

/**
 * Like tuplePar but uses at most n fibers concurrently,
 * same as `forEachParN` + `identity` with a tuple type
 */
export function tupleParN(n: number): {
  /**
   * @ets_trace call
   */
  <T extends NonEmptyArray<Managed<any, any, any>>>(
    ...t: T & {
      0: Managed<any, any, any>
    }
  ): Managed<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>>
} {
  return ((...t: Managed<any, any, any>[]) =>
    map_(collectAllParN_(t, n, accessCallTrace()), (x) => Tp.tuple(...x))) as any
}
