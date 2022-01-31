// ets_tracing: off

import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils/index.js"
import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import { map_ } from "./map.js"

/**
 * Bind a record of effects in a do
 *
 * @ets_data_first bindAll_
 */
export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAll_(s, r, __trace)
}

/**
 * Bind a record of effects in a do
 */
export function bindAll_<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Effect<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return chain_(
    s,
    (k) =>
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
      ),
    __trace
  ) as any
}

/**
 * Bind a record of effects, in parallel, in a do
 *
 * @ets_data_first bindAllPar_
 */
export function bindAllPar<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAllPar_(s, r, __trace)
}

/**
 * Bind a record of effects, in parallel, in a do
 */
export function bindAllPar_<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Effect<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return chain_(
    s,
    (k) =>
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
      ),
    __trace
  ) as any
}

/**
 * Bind a record of effects, in parallel (up to N fibers), in a do
 *
 * @ets_data_first bindAllParN_
 */
export function bindAllParN<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAllParN_(s, n, r, __trace)
}

/**
 * Bind a record of effects, in parallel (up to N fibers), in a do
 */
export function bindAllParN_<
  K,
  NER extends Record<string, Effect<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Effect<R, E, K>,
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>,
  __trace?: string
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
  }
> {
  return chain_(
    s,
    (k) =>
      map_(
        forEachParN_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          n,
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          for (const [k, v] of values) {
            res[k] = v
          }
          return Object.assign(res, k)
        }
      ),
    __trace
  ) as any
}
