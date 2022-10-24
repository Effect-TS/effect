import type { STMTypeId } from "@effect/core/stm/STM"

/**
 * Applicative structure.
 *
 * @tsplus static effect/core/stm/STM.Ops struct
 * @category constructors
 * @since 1.0.0
 */
export function struct<NER extends Record<string, STM<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, STM<any, any, any>>
): STM<
  [NER[keyof NER]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [STM<any, any, infer A>] ? A : never
  }
> {
  return STM.forEach(
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
