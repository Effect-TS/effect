import type { GenEnvSym, GenValueSym } from "@effect/core/testing/Gen"

/**
 * @tsplus static effect/core/testing/Gen.Ops struct
 */
export function struct<NER extends Record<string, Gen<any, any>>>(
  properties: EnforceNonEmptyRecord<NER> | Record<string, Gen<any, any>>
): Gen<
  [NER[keyof NER]] extends [{ [GenEnvSym]: () => infer R }] ? R : never,
  {
    readonly [K in keyof NER]: [NER[K]] extends [{ [GenValueSym]: () => infer A }] ? A : never
  }
> {
  const entries = Object.entries(properties)
  return entries.reduce(
    (b, [k, gen]) => b.zipWith(gen, (out, a) => ({ ...out, [k]: a })),
    Gen.constant({}) as Gen<any, any>
  )
}
