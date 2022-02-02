import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { _E, _R, ForcedTuple } from "../../../data/Utils"
import { Effect } from "../definition"

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static ets/EffectOps tuple
 */
export function tuple<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any>
  }
): Effect<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return Effect.collectAll(t).map((x) => Tuple(...x)) as any
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.
 *
 * @tsplus static ets/EffectOps tuplePar
 */
export function tuplePar<T extends NonEmptyArray<Effect<any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any>
  }
): Effect<_R<T[number]>, _E<T[number]>, ForcedTuple<TupleA<T>>> {
  return Effect.collectAllPar(t).map((x) => Tuple(...x)) as any
}
