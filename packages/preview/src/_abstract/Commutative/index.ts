import { Associative } from "../Associative"

/**
 * The `Commutative[A]` type class describes a commutative binary operator
 * for a type `A`. For example, addition for integers.
 */
export interface Commutative<A> extends Associative<A> {
  readonly commute: (y: A) => (x: A) => A
}

export const make = <A>(f: (r: A) => (l: A) => A): Commutative<A> => ({
  combine: f,
  commute: (y) => (x) => f(x)(y)
})
