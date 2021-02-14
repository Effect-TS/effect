import type { NonEmptyArray } from "../NonEmptyArray"
import type { _E, _R } from "../Utils"
import type { Managed } from "./managed"
import { collectAll, collectAllPar, collectAllParN_ } from "./methods/api"

export type TupleA<T extends NonEmptyArray<Managed<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 */
export function tuple<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return collectAll(t) as any
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return collectAllPar(t) as any
}

/**
 * Like tuplePar but uses at most n fibers concurrently,
 * same as `forEachParN` + `identity` with a tuple type
 */
export function tupleParN(
  n: number
): <T extends NonEmptyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
) => Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return ((...t: Managed<any, any, any>[]) => collectAllParN_(t, n)) as any
}
