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
  L extends readonly unknown[],
  A extends readonly unknown[],
  URI extends H.ConfigTypeURIS
> = {
  [k in keyof L]: k extends keyof A ? H.ConfigTypeKind<URI, L[k], A[k]> : never
}

export type InterfaceLA<Props, URI extends H.ConfigTypeURIS> = {
  [k in keyof Props]: Props[k] extends H.HKT<infer R, infer E, infer A>
    ? H.ConfigTypeKind<URI, E, A>
    : never
}
