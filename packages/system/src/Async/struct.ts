// ets_tracing: off

import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils/index.js"
import type { Async } from "./core.js"
import { map_ } from "./core.js"
import { forEach_, forEachPar_ } from "./excl-forEach.js"

/**
 * Applicative structure
 */
export function struct<NER extends Record<string, Async<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>
): Async<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEach_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    }
  ) as any
}

/**
 * Applicative structure processed in parallel
 */
export function structPar<NER extends Record<string, Async<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>,
  __trace?: string
): Async<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEachPar_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    }
  ) as any
}
