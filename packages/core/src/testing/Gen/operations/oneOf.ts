import type { GenEnvSym, GenValueSym } from "@effect/core/testing/Gen/definition"

/**
 * @tsplus static effect/core/testing/Gen.Ops oneOf
 * @category constructors
 * @since 1.0.0
 */
export function oneOf<A extends Array<Gen<any, any>>>(
  ...gens: A
): Gen<
  [A[number]] extends [{ [GenEnvSym]: () => infer R }] ? R : never,
  [A[number]] extends [{ [GenValueSym]: () => infer A }] ? A : never
> {
  return (gens.length === 0 ?
    Gen.empty :
    Gen.int({ min: 0, max: gens.length - 1 }).flatMap((i) => gens[i]!))
}
