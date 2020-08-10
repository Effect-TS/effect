import { Identity } from "../Identity"

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

declare module "../HKT" {
  interface URItoKind<K extends string, SI, SO, X, I, S, Env, Err, Out> {
    [InverseURI]: Inverse<Out>
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
