// ets_tracing: off

import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import * as Tp from "../Collections/Immutable/Tuple"
import type { _E, _R, ForcedTuple } from "../Utils"
import type { Async } from "./core"
import { map_ } from "./core"
import { collectAll, collectAllPar } from "./excl-forEach"

export type TupleA<T extends NonEmptyArray<Async<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Async<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 *
 * @ets_trace call
 */
export function tuple<T extends NonEmptyArray<Async<any, any, any>>>(
  ...t: T
): Async<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAll(t), (x) => Tp.tuple(...x)) as any
}

/**
 * Like sequenceT but parallel, same as `forEachPar` + `identity` with a tuple type
 *
 * @ets_trace call
 */
export function tuplePar<T extends NonEmptyArray<Async<any, any, any>>>(
  ...t: T
): Async<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAllPar(t), (x) => Tp.tuple(...x)) as any
}
