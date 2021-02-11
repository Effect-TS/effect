import type { Associative } from "../Associative"

/**
 * Equivalent to a Monoid
 */
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

export const IdentityURI = "Identity"
export type IdentityURI = typeof IdentityURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [IdentityURI]: Identity<A>
  }
}
