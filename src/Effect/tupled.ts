import { identity } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import type { UnionToIntersection } from "../Utils"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"

export type TupledS<T extends NonEmptyArray<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<infer S, any, any, any>] ? S : never
}[number]

export type TupledR<
  T extends NonEmptyArray<Effect<any, any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [Effect<any, infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never
  }[number]
>

export type TupledE<T extends NonEmptyArray<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer E, any>] ? E : never
}[number]

export type TupledA<T extends NonEmptyArray<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, any, infer A>] ? A : never
}

/**
 * Like `foreach` + `identity` with a tuple type
 */
export function tupled<T extends NonEmptyArray<Effect<any, any, any, any>>>(
  ...t: T
): Effect<TupledS<T>, TupledR<T>, TupledE<T>, TupledA<T>> {
  return foreach_(t, identity) as any
}

/**
 * Like sequenceT but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function tupledPar<T extends NonEmptyArray<Effect<any, any, any, any>>>(
  ...t: T
): Effect<unknown, TupledR<T>, TupledE<T>, TupledA<T>> {
  return foreachPar_(t, identity) as any
}

/**
 * Like sequenceTPar but uses at most n fibers concurrently,
 * same as `foreachParN` + `identity` with a tuple type
 */
export function tupledParN(
  n: number
): <T extends NonEmptyArray<Effect<any, any, any, any>>>(
  ...t: T
) => Effect<unknown, TupledR<T>, TupledE<T>, TupledA<T>> {
  return ((...t: Effect<any, any, any, any>[]) => foreachParN_(n)(t, identity)) as any
}
