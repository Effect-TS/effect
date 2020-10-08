import { identity } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import type { UnionToIntersection } from "../Utils"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"

export type TupleR<
  T extends NonEmptyArray<Effect<any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [Effect<infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never
  }[number]
>

export type TupleE<T extends NonEmptyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, infer E, any>] ? E : never
}[number]

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = Readonly<
  {
    [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
  }
>

/**
 * Like `foreach` + `identity` with a tuple type
 */
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<TupleR<T>, TupleE<T>, TupleA<T>> {
  return foreach_(t, identity) as any
}

/**
 * Like sequenceT but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T
): Effect<TupleR<T>, TupleE<T>, TupleA<T>> {
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
) => Effect<TupleR<T>, TupleE<T>, TupleA<T>> {
  return ((...t: Effect<any, any, any>[]) => foreachParN_(n)(t, identity)) as any
}
