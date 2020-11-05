import * as R from "../Record"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils"
import { chain_, foreach_, foreachPar_, foreachParN_, map_ } from "./core"
import type { Managed } from "./managed"

export function struct<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    foreach_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      values.forEach(([k, v]) => {
        res[k] = v
      })
      return res
    }
  ) as any
}

export function structPar<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    foreachPar_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      values.forEach(([k, v]) => {
        res[k] = v
      })
      return res
    }
  ) as any
}

export function structParN(
  n: number
): <NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return (r) =>
    map_(
      foreachParN_(n)(
        R.collect_(r, (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return res
      }
    ) as any
}

export function bindAll<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        foreach_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return res
        }
      )
    ) as any
}

export function bindAllPar<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        foreachPar_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return res
        }
      )
    ) as any
}

export function bindAllParN(
  n: number
): <
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
) => <R, E>(
  s: Managed<R, E, K>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return (r) => (s) =>
    chain_(s, (k) =>
      map_(
        foreachParN_(n)(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return res
        }
      )
    ) as any
}
