import * as R from "../Record"
import type { EnforceNonEmptyRecord, UnionToIntersection } from "../Utils"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"
import { map_ } from "./map_"

const bind = <S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<S, R, E, A>
) => <S2, R2, E2>(
  mk: Effect<S2, R2, E2, K>
): Effect<S | S2, R & R2, E | E2, K & { [k in N]: A }> =>
  chain_(mk, (k) => map_(f(k), (a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any)))

const merge = <S, R, E, A, K>(
  f: (_: K) => Effect<S, R, E, A & { [k in keyof K & keyof A]?: never }>
) => <S2, R2, E2>(mk: Effect<S2, R2, E2, K>): Effect<S | S2, R & R2, E | E2, K & A> =>
  chain_(mk, (k) => map_(f(k), (a): K & A => ({ ...k, ...a } as any)))

const let_ = <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <
  S2,
  R2,
  E2
>(
  mk: Effect<S2, R2, E2, K>
): Effect<S2, R2, E2, K & { [k in N]: A }> =>
  map_(mk, (k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))

const of = succeed({})

export { let_ as let, bind, of, merge }

export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any, any>>
): <S, R, E>(
  s: Effect<S, R, E, K>
) => Effect<
  {
    [K in keyof NER]: [NER[K]] extends [Effect<infer S, any, any, any>] ? S : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
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
  {
    [K in keyof NER]: [NER[K]] extends [Effect<infer S, any, any, any>] ? S : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
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
  {
    [K in keyof NER]: [NER[K]] extends [Effect<infer S, any, any, any>] ? S : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
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
