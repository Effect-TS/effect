import type { EffectURI } from "@effect/core/io/Effect/definition/base"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/NonEmptyReadonlyArray"

export type TupleA<T extends NonEmptyReadonlyArray<Effect<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static effect/core/io/Effect.Ops tuple
 * @category constructors
 * @since 1.0.0
 */
export function tuple<T extends NonEmptyReadonlyArray<Effect<any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any>
  }
): Effect<
  [T[number]] extends [{ [EffectURI]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectURI]: { _E: (_: never) => infer E } }] ? E : never,
  TupleA<T>
> {
  return Effect.collectAll(t).map((chunk) => Array.from(chunk)) as any
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.
 *
 * @tsplus static effect/core/io/Effect.Ops tuplePar
 * @category constructors
 * @since 1.0.0
 */
export function tuplePar<T extends NonEmptyReadonlyArray<Effect<any, any, any>>>(
  ...t: T & {
    0: Effect<any, any, any>
  }
): Effect<
  [T[number]] extends [{ [EffectURI]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectURI]: { _E: (_: never) => infer E } }] ? E : never,
  TupleA<T>
> {
  return Effect.collectAllPar(t).map((chunk) => Array.from(chunk)) as any
}
