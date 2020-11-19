import { identity } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import * as NA from "../NonEmptyArray"
import type { _E, _R } from "../Utils"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
}

/**
 * Like `foreach` + `identity` with a tuple type
 */
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  trace: string,
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>>
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>>
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  if (typeof t[0] === "string") {
    return foreach_(NA.tail(t), identity) as any
  }
  return foreach_(t, identity) as any
}

/**
 * Like sequenceT but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return foreachPar_(t, identity) as any
}

/**
 * Like sequenceTPar but uses at most n fibers concurrently,
 * same as `foreachParN` + `identity` with a tuple type
 */
export function tupleParN(
  n: number
): <T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
) => Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return ((...t: Effect<any, any, any>[]) => foreachParN_(n)(t, identity)) as any
}
