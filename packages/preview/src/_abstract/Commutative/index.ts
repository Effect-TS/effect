import { Associative } from "../Associative"

/**
 * The `Commutative[A]` type class describes a commutative binary operator
 * for a type `A`. For example, addition for integers.
 */
export interface Commutative<A> extends Associative<A> {
  readonly commute: (y: A) => (x: A) => A
}

export const CommutativeURI = "Commutative"
export type CommutativeURI = typeof CommutativeURI

declare module "../HKT" {
  interface URItoKind<K, NK extends string, SI, SO, X, I, S, Env, Err, Out> {
    [CommutativeURI]: Commutative<Out>
  }
}

export const makeCommutative = <A>(f: (r: A) => (l: A) => A): Commutative<A> => ({
  combine: f,
  commute: (y) => (x) => f(x)(y)
})
