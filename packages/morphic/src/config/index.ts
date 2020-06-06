import type { Materialized } from "../batteries/usage/materializer"

import type { UnionToIntersection } from "@matechs/core/Base/Apply"
import type * as H from "@matechs/core/Base/HKT"
import type { HKT2 } from "@matechs/morphic-alg/utils/hkt"

export type TaggedUnionA<Types, URI extends H.URIS> = {
  [k in keyof Types]: Types[k] extends HKT2<infer F, infer R, infer E, infer A>
    ? H.Kind<URI, A>
    : Types[k] extends Materialized<infer R, infer E, infer A, infer P, infer I>
    ? H.Kind<URI, A>
    : Types[k] extends [infer E, infer A]
    ? H.Kind<URI, A>
    : never
}

export type TaggedUnionLA<Types, URI extends H.URIS2> = {
  [k in keyof Types]: Types[k] extends HKT2<infer F, infer R, infer E, infer A>
    ? H.Kind2<URI, E, A>
    : Types[k] extends Materialized<infer R, infer E, infer A, infer P, infer I>
    ? H.Kind2<URI, E, A>
    : Types[k] extends [infer E, infer A]
    ? H.Kind2<URI, E, A>
    : never
}

export type IntersectionA<A extends unknown[], URI extends H.URIS> = A extends [
  infer X,
  infer Y
]
  ? [H.Kind<URI, X>, H.Kind<URI, Y>]
  : A extends [infer X, infer Y, infer Z]
  ? [H.Kind<URI, X>, H.Kind<URI, Y>, H.Kind<URI, Z>]
  : A extends [infer X, infer Y, infer Z, infer W]
  ? [H.Kind<URI, X>, H.Kind<URI, Y>, H.Kind<URI, Z>, H.Kind<URI, W>]
  : A extends [infer X, infer Y, infer Z, infer W, infer K]
  ? [H.Kind<URI, X>, H.Kind<URI, Y>, H.Kind<URI, Z>, H.Kind<URI, W>, H.Kind<URI, K>]
  : H.Kind<URI, UnionToIntersection<A[number]>>[]

export type IntersectionLA<
  L extends unknown[],
  A extends unknown[],
  URI extends H.URIS2
> = [L, A] extends [[infer XL, infer YL], [infer X, infer Y]]
  ? [H.Kind2<URI, XL, X>, H.Kind2<URI, YL, Y>]
  : [L, A] extends [[infer XL, infer YL, infer ZL], [infer X, infer Y, infer Z]]
  ? [H.Kind2<URI, XL, X>, H.Kind2<URI, YL, Y>, H.Kind2<URI, ZL, Z>]
  : [L, A] extends [
      [infer XL, infer YL, infer ZL, infer WL],
      [infer X, infer Y, infer Z, infer W]
    ]
  ? [H.Kind2<URI, XL, X>, H.Kind2<URI, YL, Y>, H.Kind2<URI, ZL, Z>, H.Kind2<URI, WL, W>]
  : [L, A] extends [
      [infer XL, infer YL, infer ZL, infer WL, infer KL],
      [infer X, infer Y, infer Z, infer W, infer K]
    ]
  ? [
      H.Kind2<URI, XL, X>,
      H.Kind2<URI, YL, Y>,
      H.Kind2<URI, ZL, Z>,
      H.Kind2<URI, WL, W>,
      H.Kind2<URI, KL, K>
    ]
  : H.Kind2<URI, UnionToIntersection<L[number]>, UnionToIntersection<A[number]>>[]

export type InterfaceA<Props, URI extends H.URIS> = {
  [k in keyof Props]: Props[k] extends HKT2<infer U, infer R, infer E, infer A>
    ? H.Kind<URI, A>
    : never
}

export type InterfaceLA<Props, URI extends H.URIS2> = {
  [k in keyof Props]: Props[k] extends HKT2<infer U, infer R, infer E, infer A>
    ? H.Kind2<URI, E, A>
    : never
}
