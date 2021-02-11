import type { XPure } from "@effect-ts/system/XPure"

export interface XIO<A> extends XPure<unknown, unknown, unknown, never, A> {}

export const XIOURI = "XIO"
export type XIOURI = typeof XIOURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [XIOURI]: XIO<A>
  }
}
