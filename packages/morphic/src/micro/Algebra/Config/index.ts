import type { UnionToIntersection } from "@effect-ts/core/Utils"

import type { Materialized } from "../../Batteries/usage/materializer"
import type * as H from "../../HKT"

export type TaggedUnionLA<Types, URI extends H.ConfigTypeURIS> = {
  [k in keyof Types]: Types[k] extends H.HKT<infer R, infer E, infer A>
    ? H.ConfigTypeKind<URI, E, A>
    : Types[k] extends Materialized<infer R, infer E, infer A, infer P, infer I>
    ? H.ConfigTypeKind<URI, E, A>
    : Types[k] extends [infer E, infer A]
    ? H.ConfigTypeKind<URI, E, A>
    : never
}

export type IntersectionLA<
  L extends unknown[],
  A extends unknown[],
  URI extends H.ConfigTypeURIS
> = [L, A] extends [[infer XL, infer YL], [infer X, infer Y]]
  ? [H.ConfigTypeKind<URI, XL, X>, H.ConfigTypeKind<URI, YL, Y>]
  : [L, A] extends [[infer XL, infer YL, infer ZL], [infer X, infer Y, infer Z]]
  ? [
      H.ConfigTypeKind<URI, XL, X>,
      H.ConfigTypeKind<URI, YL, Y>,
      H.ConfigTypeKind<URI, ZL, Z>
    ]
  : [L, A] extends [
      [infer XL, infer YL, infer ZL, infer WL],
      [infer X, infer Y, infer Z, infer W]
    ]
  ? [
      H.ConfigTypeKind<URI, XL, X>,
      H.ConfigTypeKind<URI, YL, Y>,
      H.ConfigTypeKind<URI, ZL, Z>,
      H.ConfigTypeKind<URI, WL, W>
    ]
  : [L, A] extends [
      [infer XL, infer YL, infer ZL, infer WL, infer KL],
      [infer X, infer Y, infer Z, infer W, infer K]
    ]
  ? [
      H.ConfigTypeKind<URI, XL, X>,
      H.ConfigTypeKind<URI, YL, Y>,
      H.ConfigTypeKind<URI, ZL, Z>,
      H.ConfigTypeKind<URI, WL, W>,
      H.ConfigTypeKind<URI, KL, K>
    ]
  : H.ConfigTypeKind<
      URI,
      UnionToIntersection<L[number]>,
      UnionToIntersection<A[number]>
    >[]

export type InterfaceLA<Props, URI extends H.ConfigTypeURIS> = {
  [k in keyof Props]: Props[k] extends H.HKT<infer R, infer E, infer A>
    ? H.ConfigTypeKind<URI, E, A>
    : never
}
