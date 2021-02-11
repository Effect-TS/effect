import type { Equal } from "@effect-ts/system/Equal"

export * from "@effect-ts/system/Equal"

export const EqualURI = "Equal"
export type EqualURI = typeof EqualURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [EqualURI]: Equal<A>
  }
}
