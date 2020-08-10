import { pipe, tuple } from "../../Function"
import { EnforceNonEmptyRecord, UnionToIntersection } from "../../Utils"
import * as A from "../../_system/Array"
import { ApplicativeK, ApplicativeF } from "../Applicative"
import { URIS, Kind, HKT8, HKT } from "../HKT"

import { anyF } from "./core"

export function sequenceSF<F extends URIS>(
  F: ApplicativeK<F>
): <SIO>() => <
  S,
  NER extends Record<string, Kind<F, SIO, SIO, any, any, S, any, any, any>>
>(
  r: EnforceNonEmptyRecord<NER>
) => Kind<
  F,
  SIO,
  SIO,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind<F, any, any, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends In
          ? never
          : In
        : never
    }[keyof NER]
  >,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind<F, any, any, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): <SIO>() => <
  S,
  NER extends Record<string, HKT8<F, SIO, SIO, any, any, S, any, any, any>>
>(
  r: EnforceNonEmptyRecord<NER>
) => HKT8<
  F,
  SIO,
  SIO,
  {
    [K in keyof NER]: [NER[K]] extends [
      HKT8<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        HKT8<F, any, any, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends In
          ? never
          : In
        : never
    }[keyof NER]
  >,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        HKT8<F, any, any, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      HKT8<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      HKT8<F, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): () => (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>> {
  return () => (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduce(anyF(F)([] as readonly (readonly [string, any])[]), (b, a) =>
        pipe(
          b,
          F.both(a[1]),
          F.map(([x, y]) => [...x, tuple(a[0], y)])
        )
      ),
      F.map((a) => {
        const res = {}
        a.forEach(([k, v]) => {
          res[k] = v
        })
        return res
      })
    )
}
