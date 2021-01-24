import { identity } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import type { _E, _R } from "../Utils"
import type { Effect } from "./effect"
import { forEach_, forEachPar_, forEachParN_ } from "./forEach"

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type
 *
 */
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return forEach_(t, identity) as any
}

/**
 * Like sequenceT but parallel, same as `forEachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return forEachPar_(t, identity) as any
}

/**
 * Like sequenceTPar but uses at most n fibers concurrently,
 * same as `forEachParN` + `identity` with a tuple type
 */
export function tupleParN(
  n: number
): <T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
) => Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return ((...t: Effect<any, any, any>[]) => forEachParN_(t, n, identity)) as any
}
