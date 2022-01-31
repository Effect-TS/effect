// ets_tracing: off
import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils/index.js"
import type { Async } from "./core.js"
import { chain_, map_ } from "./core.js"
import { forEach_, forEachPar_ } from "./excl-forEach.js"

/**
 * Bind a record of effects in a do
 *
 * @ets_data_first bindAll_
 */
export function bindAll<
  K,
  NER extends Record<string, Async<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>
): <R, E>(
  s: Async<R, E, K>
) => Async<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAll_(s, r)
}

/**
 * Bind a record of effects in a do
 */
export function bindAll_<
  K,
  NER extends Record<string, Async<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Async<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>
): Async<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  return chain_(s, (k) =>
    map_(
      forEach_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        for (const [k, v] of values) {
          res[k] = v
        }
        return Object.assign(res, k)
      }
    )
  ) as any
}

/**
 * Bind a record of effects, in parallel, in a do
 *
 * @ets_data_first bindAllPar_
 */
export function bindAllPar<
  K,
  NER extends Record<string, Async<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>
): <R, E>(
  s: Async<R, E, K>
) => Async<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAllPar_(s, r)
}

/**
 * Bind a record of effects, in parallel, in a do
 */
export function bindAllPar_<
  K,
  NER extends Record<string, Async<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Async<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Async<any, any, any>>
): Async<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Async<any, any, infer A>] ? A : never
  }
> {
  return chain_(s, (k) =>
    map_(
      forEachPar_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        for (const [k, v] of values) {
          res[k] = v
        }
        return Object.assign(res, k)
      }
    )
  ) as any
}
