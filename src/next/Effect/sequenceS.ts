import { SOf, EnvOf } from "../../Base/Apply"
import * as R from "../../Record"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { foreachParN_ } from "./foreachParN_"
import { foreachPar_ } from "./foreachPar_"
import { foreach_ } from "./foreach_"
import { map_ } from "./map_"

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export function sequenceS<NER extends Record<string, Effect<any, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
): Effect<
  SOf<NER>,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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

export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
): <S, R, E>(
  s: Effect<S, R, E, K>
) => Effect<
  SOf<NER>,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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
  NER extends Record<string, Effect<any, any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
): <S, R, E>(
  s: Effect<S, R, E, K>
) => Effect<
  SOf<NER>,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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
  NER extends Record<string, Effect<any, any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
) => <S, R, E>(
  s: Effect<S, R, E, K>
) => Effect<
  SOf<NER>,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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

export function sequenceSPar<NER extends Record<string, Effect<any, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
): Effect<
  unknown,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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

export function sequenceSParN(
  n: number
): <NER extends Record<string, Effect<any, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
) => Effect<
  unknown,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, any, infer A>] ? A : never
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
