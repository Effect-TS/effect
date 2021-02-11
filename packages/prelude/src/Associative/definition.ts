import type { Closure } from "../Closure"

/**
 * The `Associative[A]` type class describes an associative binary operator
 * for a type `A`. For example, addition for integers, and string
 * concatenation for strings.
 */
export interface Associative<A> extends Closure<A> {
  readonly Associative: "Associative"
}

export const AssociativeURI = "Associative"
export type AssociativeURI = typeof AssociativeURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [AssociativeURI]: Associative<A>
  }
}
