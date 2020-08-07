import { Identity } from "../Identity"

export interface Inverse<A> extends Identity<A> {
  /**
   * Returns a right inverse for the given `A` value, such that when
   * the value is combined with the inverse (on the right hand side),
   * the identity element is returned.
   */
  readonly inverse: (r: A) => (l: A) => A
}

export function make<A>(
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
