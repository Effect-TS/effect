import * as R from "../../../collection/immutable/Dictionary"
import type { EnforceNonEmptyRecord } from "../../../data/Utils"
import type * as UT from "../../../data/Utils/types"
import { Effect } from "../definition"

/**
 * Applicative structure.
 *
 * @tsplus static ets/EffectOps struct
 */
export function struct<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __tsplusTrace?: string
): Effect<
  UT._R<NER[keyof NER]>,
  UT._E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return Effect.forEach(
    R.collect_(r, (k, v) => [k, v] as const),
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
 * @tsplus static ets/EffectOps structPar
 */
export function structPar<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __tsplusTrace?: string
): Effect<
  UT._R<NER[keyof NER]>,
  UT._E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return Effect.forEachPar(
    R.collect_(r, (k, v) => [k, v] as const),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {}
    for (const [k, v] of values) {
      res[k] = v
    }
    return res
  }) as any
}
