import type { _E, _R } from "@effect/core/stm/STM/definition/base";

/**
 * Applicative structure.
 *
 * @tsplus static ets/STM/Ops struct
 */
export function struct<NER extends Record<string, STM<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, STM<any, any, any>>,
  __tsplusTrace?: string
): STM<
  [NER[keyof NER]] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [NER[keyof NER]] extends [{ [_E]: () => infer E; }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [STM<any, any, infer A>] ? A : never;
  }
> {
  return STM.forEach(
    Object.entries(r),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {};
    for (const [k, v] of values) {
      res[k] = v;
    }
    return res;
  }) as any;
}
