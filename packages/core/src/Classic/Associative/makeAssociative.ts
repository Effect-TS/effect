import type { Associative } from "./definition"

export const makeAssociative = <A>(f: (r: A) => (l: A) => A): Associative<A> => ({
  Associative: "Associative",
  combine: f
})

export * from "./definition"
