import { Associative } from "../Associative"

export interface Commutative<A> extends Associative<A> {
  readonly commute: (y: A) => (x: A) => A
}

export const make = <A>(f: (r: A) => (l: A) => A): Commutative<A> => ({
  combine: f,
  commute: (y) => (x) => f(x)(y)
})
