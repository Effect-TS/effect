import * as R from "../Record"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { forEach_, forEachPar_, forEachParN_ } from "./forEach"
import { map_ } from "./map"

export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEach_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}

export function bindAllPar<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEachPar_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}
/**
 * @dataFirst bindAllParN_
 */

export function bindAllParN<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEachParN_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          n,
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}

export function bindAllParN_<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    },
  R,
  E
>(
  s: Effect<R, E, K>,
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEachParN_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        n,
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      }
    )
  ) as any
}
