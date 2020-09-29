import * as R from "../Record"
import type { EnforceNonEmptyRecord, UnionToIntersection } from "../Utils"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { foreachParN_ } from "./foreachParN_"
import { map_ } from "./map_"

function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>
) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R & R2,
    E | E2,
    K &
      {
        [k in N]: A
      }
  > =>
    chain_(mk, (k) =>
      map_(
        f(k),
        (
          a
        ): K &
          {
            [k in N]: A
          } => ({ ...k, [tag]: a } as any)
      )
    )
}

function merge<R, E, A, K>(
  f: (
    _: K
  ) => Effect<
    R,
    E,
    A &
      {
        [k in keyof K & keyof A]?: never
      }
  >
) {
  return <R2, E2>(mk: Effect<R2, E2, K>): Effect<R & R2, E | E2, K & A> =>
    chain_(mk, (k) => map_(f(k), (a): K & A => ({ ...k, ...a } as any)))
}

function let_<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R2,
    E2,
    K &
      {
        [k in N]: A
      }
  > =>
    map_(
      mk,
      (
        k
      ): K &
        {
          [k in N]: A
        } => ({ ...k, [tag]: f(k) } as any)
    )
}

const do_ = succeed({})

export { let_ as let, bind, do_ as do, merge }

export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
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
  NER extends Record<string, Effect<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
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
  NER extends Record<string, Effect<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
) => <R, E>(
  s: Effect<R, E, K>
) => Effect<
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Effect<infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
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
