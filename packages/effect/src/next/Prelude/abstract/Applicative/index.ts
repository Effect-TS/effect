import * as A from "../../../../Array"
import { pipe, tuple } from "../../../../Function"
import { UnionToIntersection } from "../../../Utils"
import { succeedF } from "../Any"
import {
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6,
  CovariantF
} from "../Covariant"
import {
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"
import {
  IdentityBoth1,
  IdentityBoth2,
  IdentityBoth3,
  IdentityBoth4,
  IdentityBoth5,
  IdentityBoth6,
  IdentityBothF
} from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type Applicative1<F extends URIS> = IdentityBoth1<F> & Covariant1<F>

export type Applicative2<F extends URIS2> = IdentityBoth2<F> & Covariant2<F>

export type Applicative3<F extends URIS3> = IdentityBoth3<F> & Covariant3<F>

export type Applicative4<F extends URIS4> = IdentityBoth4<F> & Covariant4<F>

export type Applicative5<F extends URIS5> = IdentityBoth5<F> & Covariant5<F>

export type Applicative6<F extends URIS6> = IdentityBoth6<F> & Covariant6<F>

export function makeApplicative<URI extends URIS>(
  _: URI
): (_: Omit<Applicative1<URI>, "URI">) => Applicative1<URI>
export function makeApplicative<URI extends URIS2>(
  _: URI
): (_: Omit<Applicative2<URI>, "URI">) => Applicative2<URI>
export function makeApplicative<URI extends URIS3>(
  _: URI
): (_: Omit<Applicative3<URI>, "URI">) => Applicative3<URI>
export function makeApplicative<URI extends URIS4>(
  _: URI
): (_: Omit<Applicative4<URI>, "URI">) => Applicative4<URI>
export function makeApplicative<URI extends URIS5>(
  _: URI
): (_: Omit<Applicative5<URI>, "URI">) => Applicative5<URI>
export function makeApplicative<URI extends URIS6>(
  _: URI
): (_: Omit<Applicative6<URI>, "URI">) => Applicative6<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export function sequenceSF<F extends URIS6>(
  F: Applicative6<F>
): <S, NER extends Record<string, Kind6<F, any, any, S, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind6<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind6<F, infer X, infer In, infer S, infer R, infer E, infer A>
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
        Kind6<F, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F extends URIS5>(
  F: Applicative5<F>
): <S, NER extends Record<string, Kind5<F, any, S, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind5<
  F,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind5<F, infer In, infer S, infer R, infer E, infer A>
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
        Kind5<F, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind5<F, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind5<F, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F extends URIS4>(
  F: Applicative4<F>
): <S, NER extends Record<string, Kind4<F, S, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind4<
  F,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, infer S, infer R, infer E, infer A>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, infer S, infer S, infer E, infer A>]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, infer S, infer S, infer E, infer A>]
      ? A
      : never
  }
>
export function sequenceSF<F extends URIS3>(
  F: Applicative3<F>
): <NER extends Record<string, Kind3<F, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind3<
  F,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, infer R, infer E, infer A>]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [Kind3<F, infer S, infer E, infer A>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Kind3<F, infer S, infer E, infer A>] ? A : never
  }
>
export function sequenceSF<F extends URIS2>(
  F: Applicative2<F>
): <NER extends Record<string, Kind2<F, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind2<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [Kind2<F, infer E, infer A>] ? E : never
  }[keyof NER],
  { [K in keyof NER]: [NER[K]] extends [Kind2<F, infer E, infer A>] ? A : never }
>
export function sequenceSF<F extends URIS>(
  F: Applicative1<F>
): <NER extends Record<string, Kind<F, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind<F, { [K in keyof NER]: [NER[K]] extends [Kind<F, infer A>] ? A : never }>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): <NER extends Record<string, HKT<F, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => HKT<F, { [K in keyof NER]: [NER[K]] extends [HKT<F, infer A>] ? A : never }>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>> {
  return (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduce(succeedF(F)([] as readonly [string, any][]), (b, a) =>
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
