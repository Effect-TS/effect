// tracing: off

import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import { accessCallTrace } from "../Tracing"
import type { _E, _R } from "../Utils"
import type { Effect } from "./effect"
import { collectAll, collectAllPar, collectAllParN_ } from "./excl-forEach"

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
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return collectAll(t, accessCallTrace()) as any
}

/**
 * Like sequenceT but parallel, same as `forEachPar` + `identity` with a tuple type
 *
 * @trace call
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  return collectAllPar(t, accessCallTrace()) as any
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
    ): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> =>
      collectAllParN_(t, n, accessCallTrace()) as any
  )
}
