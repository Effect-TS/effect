import { identity } from "../Function"
import { UnionToIntersection } from "../Utils"

import { Effect } from "./effect"
import { foreachParN_ } from "./foreachParN_"
import { foreachPar_ } from "./foreachPar_"
import { foreach_ } from "./foreach_"

export type SequenceS<T extends Array<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<infer S, any, any, any>] ? S : never
}[number]

export type SequenceR<
  T extends Array<Effect<any, any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [Effect<any, infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never
  }[number]
>

export type SequenceE<T extends Array<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer E, any>] ? E : never
}[number]

export type SequenceA<T extends Array<Effect<any, any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, any, infer A>] ? A : never
}

/**
 * Like `foreach` + `identity` with a tuple type
 */
export function sequenceT<T extends Array<Effect<any, any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any, any>
  }
): Effect<SequenceS<T>, SequenceR<T>, SequenceE<T>, SequenceA<T>> {
  return foreach_(t, identity) as any
}

/**
 * Like sequenceT but parallel, same as `foreachPar` + `identity` with a tuple type
 */
export function sequenceTPar<T extends Array<Effect<any, any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any, any>
  }
): Effect<unknown, SequenceR<T>, SequenceE<T>, SequenceA<T>> {
  return foreachPar_(t, identity) as any
}

/**
 * Like sequenceTPar but uses at most n fibers concurrently,
 * same as `foreachParN` + `identity` with a tuple type
 */
export function sequenceTParN(
  n: number
): <T extends Array<Effect<any, any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any, any>
  }
) => Effect<unknown, SequenceR<T>, SequenceE<T>, SequenceA<T>> {
  return ((...t: Effect<any, any, any, any>[]) => foreachParN_(n)(t, identity)) as any
}
