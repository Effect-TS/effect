import type { EffectURI } from "@effect/core/io/Effect/definition/base"

/**
 * Applicative structure.
 *
 * @tsplus static effect/core/io/Effect.Ops struct
 * @category constructors
 * @since 1.0.0
 */
export function struct<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, Effect<any, any, any>>
): Effect<
  [NER[keyof NER]] extends [{ [EffectURI]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [EffectURI]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [EffectURI]: { _A: (_: never) => infer A } }] ? A : never
  }
> {
  return Effect.forEach(
    Object.entries(r),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {}
    for (const [k, v] of values) {
      res[k] = v
    }
    return res
  }) as any
}

/**
 * Applicative structure processed in parallel.
 *
 * @tsplus static effect/core/io/Effect.Ops structPar
 * @category constructors
 * @since 1.0.0
 */
export function structPar<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, Effect<any, any, any>>
): Effect<
  [NER[keyof NER]] extends [{ [EffectURI]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [EffectURI]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [EffectURI]: { _A: (_: never) => infer A } }] ? A : never
  }
> {
  return Effect.forEachPar(
    Object.entries(r),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {}
    for (const [k, v] of values) {
      res[k] = v
    }
    return res
  }) as any
}
