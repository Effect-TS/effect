import type { Associative } from "./definition"

export const makeAssociative = <A>(f: (r: A) => (l: A) => A): Associative<A> => ({
  combine: f
})
