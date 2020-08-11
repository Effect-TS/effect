import { pipe, tuple } from "../../Function"
import { EnforceNonEmptyRecord, UnionToIntersection } from "../../Utils"
import * as A from "../../_system/Array"
import { ApplicativeF, ApplicativeK } from "../Applicative"
import { HKT, HKT10, HKTFix, Kind, KindFix, URIS } from "../HKT"

import { anyF } from "./core"

export function sequenceSF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: ApplicativeK<F, Fix0, Fix1, Fix2, Fix3>
): <SIO>() => <
  S,
  NER extends Record<
    string,
    KindFix<F, Fix0, Fix1, Fix2, Fix3, any, any, SIO, SIO, any, any, S, any, any, any>
  >
>(
  r: EnforceNonEmptyRecord<NER>
) => KindFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, infer X, any, any, any, any, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, infer X, any, any, any, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  SIO,
  SIO,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind<
          F,
          any,
          any,
          any,
          any,
          infer X,
          infer In,
          infer S,
          infer R,
          infer E,
          infer A
        >
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
        Kind<
          F,
          any,
          any,
          any,
          any,
          infer X,
          infer In,
          infer S,
          infer R,
          infer E,
          infer A
        >
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, any, any, any, any, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: ApplicativeF<F, Fix0, Fix1, Fix2, Fix3>
): <SIO>() => <
  S,
  NER extends Record<
    string,
    HKTFix<F, Fix0, Fix1, Fix2, Fix3, any, any, SIO, SIO, any, any, S, any, any, any>
  >
>(
  r: EnforceNonEmptyRecord<NER>
) => HKT10<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [
      HKTFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        infer X,
        any,
        any,
        any,
        any,
        infer In,
        infer S,
        infer S,
        infer E,
        infer A
      >
    ]
      ? X
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      HKTFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        any,
        infer X,
        any,
        any,
        any,
        infer In,
        infer S,
        infer S,
        infer E,
        infer A
      >
    ]
      ? X
      : never
  }[keyof NER],
  SIO,
  SIO,
  {
    [K in keyof NER]: [NER[K]] extends [
      HKTFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        any,
        any,
        any,
        any,
        infer X,
        infer In,
        infer S,
        infer S,
        infer E,
        infer A
      >
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        HKTFix<
          F,
          Fix0,
          Fix1,
          Fix2,
          Fix3,
          any,
          any,
          any,
          any,
          infer X,
          infer In,
          infer S,
          infer R,
          infer E,
          infer A
        >
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
        HKTFix<
          F,
          Fix0,
          Fix1,
          Fix2,
          Fix3,
          any,
          any,
          any,
          any,
          infer X,
          infer In,
          infer S,
          infer R,
          infer E,
          infer A
        >
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      HKTFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        any,
        any,
        any,
        any,
        infer X,
        infer In,
        infer S,
        infer S,
        infer E,
        infer A
      >
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      HKTFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        any,
        any,
        any,
        any,
        infer X,
        infer In,
        infer S,
        infer S,
        infer E,
        infer A
      >
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
