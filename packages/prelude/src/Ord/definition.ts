import type { Equal } from "../Equal"
import type { Ordering } from "../Ordering"

/**
 * `Ord[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Ord<A> extends Equal<A> {
  readonly compare: (y: A) => (x: A) => Ordering
}

export const OrdURI = "Ord"
export type OrdURI = typeof OrdURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [OrdURI]: Ord<A>
  }
}
