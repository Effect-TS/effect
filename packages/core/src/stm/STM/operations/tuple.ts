import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { _E, _R, ForcedTuple } from "../../../data/Utils"
import { STM } from "../definition"

export type TupleA<T extends NonEmptyArray<STM<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [STM<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static ets/STMOps tuple
 */
export function tuple<T extends NonEmptyArray<STM<any, any, any>>>(
  ...t: T & {
    0: STM<any, any, any>
  }
): STM<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return STM.collectAll(t).map((x) => Tuple(...x)) as any
}
