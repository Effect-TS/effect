import type { Ord } from "../Ord"
import type { Ordering } from "../Ordering"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}

export const BoundedURI = "Bounded"
export type BoundedURI = typeof BoundedURI

declare module "../../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [BoundedURI]: Bounded<A>
  }
}

/**
 * Creates Bounded[A] from equals & compare functions
 */
export function makeBounded<A>(
  equals: (y: A) => (x: A) => boolean,
  compare: (y: A) => (x: A) => Ordering,
  top: A,
  bottom: A
): Bounded<A> {
  return {
    compare,
    equals,
    bottom,
    top
  }
}
