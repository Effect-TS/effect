import type { Closure } from "./definition"

export const makeClosure = <A>(f: (l: A, r: A) => A): Closure<A> => ({
  combine: (r) => (l) => f(l, r)
})
