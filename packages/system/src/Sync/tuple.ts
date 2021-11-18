// ets_tracing: off

import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import * as Tp from "../Collections/Immutable/Tuple"
import type { _E, _R, ForcedTuple } from "../Utils"
import type { Sync } from "./core"
import { map_ } from "./core"
import { collectAll } from "./excl-forEach"

export type TupleA<T extends NonEmptyArray<Sync<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Sync<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 */
export function tuple<T extends NonEmptyArray<Sync<any, any, any>>>(
  ...t: T
): Sync<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return map_(collectAll(t), (x) => Tp.tuple(...x)) as any
}
