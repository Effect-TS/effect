import type { Commutative } from "./definition"

export const makeCommutative = <A>(f: (r: A) => (l: A) => A): Commutative<A> => ({
  Associative: "Associative",
  Commutative: "Commutative",
  combine: f,
  commute: (y) => (x) => f(x)(y)
})
