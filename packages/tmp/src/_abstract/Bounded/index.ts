import { Ord } from "../Ord"
import { Ordering } from "../Ordering"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}

export const BoundedURI = "Bounded"
export type BoundedURI = typeof BoundedURI

declare module "../HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [BoundedURI]: Bounded<Out>
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
