import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { _E, _R, ForcedTuple } from "../../../data/Utils"
import { Managed } from "../definition"

export type TupleA<T extends NonEmptyArray<Managed<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static ets/ManagedOps tuple
 */
export function tuple<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return Managed.collectAll(t).map((x) => Tuple(...x)) as any
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.
 *
 * @tsplus static ets/ManagedOps tuplePar
 */
export function tuplePar<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return Managed.collectAllPar(t).map((x) => Tuple(...x)) as any
}
