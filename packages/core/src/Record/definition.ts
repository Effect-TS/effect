import * as R from "@effect-ts/system/Record"

import type * as P from "../Prelude"

export type V = P.V<"N", "_">

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [RecordURI]: R.Record<N, A>
  }
  interface URItoIndex<N extends string, K> {
    [RecordURI]: N
  }
}
