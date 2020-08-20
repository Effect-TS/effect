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

declare module "../../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [InverseURI]: Inverse<A>
  }
}

export function makeInverse<A>(
  identity: A,
  combine: (y: A) => (x: A) => A,
  inverse: (r: A) => (l: A) => A
): Inverse<A> {
  return {
    combine,
    identity,
    inverse
  }
}
