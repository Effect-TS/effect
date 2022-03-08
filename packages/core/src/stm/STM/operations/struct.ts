import * as R from "../../../collection/immutable/Dictionary"
import type { EnforceNonEmptyRecord } from "../../../data/Utils"
import type * as UT from "../../../data/Utils/types"
import { STM } from "../definition"

/**
 * Applicative structure.
 *
 * @tsplus static ets/STMOps struct
 */
export function struct<NER extends Record<string, STM<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, STM<any, any, any>>,
  __tsplusTrace?: string
): STM<
  UT._R<NER[keyof NER]>,
  UT._E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [STM<any, any, infer A>] ? A : never
  }
> {
  return STM.forEach(
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
