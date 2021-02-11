import type { Closure } from "./definition"

export const makeClosure = <A>(f: (r: A) => (l: A) => A): Closure<A> => ({
  combine: f
})
