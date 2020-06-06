import type { HKT2 } from "@morphic-ts/common/lib/HKT"

import type { Materialized } from "../batteries/usage/materializer"

import type { UnionToIntersection } from "@matechs/core/Base/Apply"
import type * as H from "@matechs/core/Base/HKT"

export type TaggedUnionA<Types, URI extends H.URIS> = {
  [k in keyof Types]: Types[k] extends HKT2<infer F, infer R, infer E, infer A>
    ? H.Kind<URI, A>
    : Types[k] extends Materialized<infer R, infer E, infer A, infer P, infer I>
    ? H.Kind<URI, A>
    : Types[k] extends [infer E, infer A]
    ? H.Kind<URI, A>
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

export type InterfaceA<Props, URI extends H.URIS> = {
  [k in keyof Props]: Props[k] extends HKT2<infer U, infer R, infer E, infer A>
    ? H.Kind<URI, A>
    : never
}
