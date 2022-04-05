import type { _A, _E, _R } from "@effect-ts/core/io/Effect/definition/base";

/**
 * Applicative structure.
 *
 * @tsplus static ets/Effect/Ops struct
 */
export function struct<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __tsplusTrace?: string
): Effect<
  [NER[keyof NER]] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [NER[keyof NER]] extends [{ [_E]: () => infer E; }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [_A]: () => infer A; }] ? A : never;
  }
> {
  return Effect.forEach(
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

/**
 * Applicative structure processed in parallel.
 *
 * @tsplus static ets/Effect/Ops structPar
 */
export function structPar<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __tsplusTrace?: string
): Effect<
  [NER[keyof NER]] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [NER[keyof NER]] extends [{ [_E]: () => infer E; }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [_A]: () => infer A; }] ? A : never;
  }
> {
  return Effect.forEachPar(
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
