import type { XPure } from "@effect-ts/system/XPure"

import type * as P from "../../Prelude"

export type V = P.V<"S", "_">

export interface XState<S, A> extends XPure<S, S, unknown, never, A> {}

export const XStateURI = "XState"
export type XStateURI = typeof XStateURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [XStateURI]: XState<S, A>
  }
}
