import { identity } from "../Function"
import type { _E, _R } from "../Utils"
import { foreach_, foreachPar_, foreachParN_ } from "./core"
import type { Managed } from "./managed"

export type TupleA<T extends Array<Managed<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
}

/**
 * Like `foreach` + `identity` with a tuple type
 */
export function tuple<T extends Array<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return foreach_(t, identity) as any
}

/**
 * Like tuple but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends Array<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return foreachPar_(t, identity) as any
}

/**
 * Like tuplePar but uses at most n fibers concurrently,
 * same as `foreachParN` + `identity` with a tuple type
 */
export function tupleParN(
  n: number
): <T extends Array<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
) => Managed<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return ((...t: Managed<any, any, any>[]) => foreachParN_(n)(t, identity)) as any
}
