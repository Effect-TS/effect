// ets_tracing: off

import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils/index.js"
import type { Effect } from "./effect.js"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import { map_ } from "./map.js"

/**
 * Applicative structure
 */
export function struct<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): Effect<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEach_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
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
export function structPar<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): Effect<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEachPar_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
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
 * Applicative structure processed in parallel with up to N fibers
 *
 * @ets_data_first structParN_
 */
export function structParN(n: number, __trace?: string) {
  return <NER extends Record<string, Effect<any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
  ): Effect<
    _R<NER[keyof NER]>,
    _E<NER[keyof NER]>,
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
  > =>
    // @ts-expect-error
    structParN_(r, n, __trace)
}

/**
 * Applicative structure processed in parallel with up to N fibers
 */
export function structParN_<NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  n: number,
  __trace?: string
): Effect<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEachParN_(
      R.collect_(r, (k, v) => [k, v] as const),
      n,
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
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
