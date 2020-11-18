import { identity } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import { traceF, traceWith } from "../Tracing"
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
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  const trace = traceF(() => traceWith("Effect/tuple"))
  const f = trace(identity)
  return foreach_(t, f) as any
}

/**
 * Like sequenceT but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<_R<T[number]>, _E<T[number]>, TupleA<T>> {
  const trace = traceF(() => traceWith("Effect/tuplePar"))
  const f = trace(identity)
  return foreachPar_(t, f) as any
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
  const trace = traceF(() => traceWith("Effect/tupleParN"))
  const f = trace(identity)
  return ((...t: Effect<any, any, any>[]) => foreachParN_(n)(t, f)) as any
}
