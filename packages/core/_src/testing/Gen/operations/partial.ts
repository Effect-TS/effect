import type { GenEnvSym, GenValueSym } from "@effect/core/testing/Gen"

/**
 * @tsplus static effect/core/testing/Gen.Ops partial
 */
export function partial<NER extends Record<string, Gen<any, any>>>(
  properties: EnforceNonEmptyRecord<NER> | Record<string, Gen<any, any>>
): Gen<
  [NER[keyof NER]] extends [{ [GenEnvSym]: () => infer R }] ? R : never,
  Partial<
    {
      readonly [K in keyof NER]: [NER[K]] extends [{ [GenValueSym]: () => infer A }] ? A : never
    }
  >
> {
  const entries = Object.entries(properties)
  return entries.reduce(
    (b, [k, gen]) =>
      Gen.unwrap(
        Effect.ifEffect(
          Random.nextBoolean,
          Effect.sync(b.zipWith(gen, (r, a) => ({ ...r, [k]: a }))),
          Effect.sync(b)
        )
      ),
    Gen.constant({}) as Gen<any, any>
  )
}
