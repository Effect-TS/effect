import type { XPure } from "@effect-ts/system/XPure"

export interface XReader<R, A> extends XPure<unknown, unknown, R, never, A> {}

export const XReaderURI = "XReader"
export type XReaderURI = typeof XReaderURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [XReaderURI]: XReader<R, A>
  }
}
