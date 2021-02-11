import type { Associative } from "../Associative"

/**
 * The `Commutative[A]` type class describes a commutative binary operator
 * for a type `A`. For example, addition for integers.
 */
export interface Commutative<A> extends Associative<A> {
  readonly Commutative: "Commutative"

  readonly commute: (y: A) => (x: A) => A
}

export const CommutativeURI = "Commutative"
export type CommutativeURI = typeof CommutativeURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [CommutativeURI]: Commutative<A>
  }
}
