import type { Identity } from "../Identity"

export interface Inverse<A> extends Identity<A> {
  /**
   * Returns a right inverse for the given `A` value, such that when
   * the value is combined with the inverse (on the right hand side),
   * the identity element is returned.
   */
  readonly inverse: (r: A) => (l: A) => A
}

export const InverseURI = "Inverse"
export type InverseURI = typeof InverseURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [InverseURI]: Inverse<A>
  }
}
