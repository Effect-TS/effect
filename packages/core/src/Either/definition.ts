import type { Either } from "@effect-ts/system/Either"

import type * as P from "../Prelude"

export type V = P.V<"E", "+">

export const EitherURI = "Either"
export type EitherURI = typeof EitherURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [EitherURI]: Either<E, A>
  }
}
