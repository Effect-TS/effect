import type { Commutative } from "./definition"

export const makeCommutative = <A>(f: (r: A) => (l: A) => A): Commutative<A> => ({
  combine: f,
  commute: (y) => (x) => f(x)(y)
})
