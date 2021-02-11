import type { Ord } from "../Ord"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}

export const BoundedURI = "Bounded"
export type BoundedURI = typeof BoundedURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [BoundedURI]: Bounded<A>
  }
}
