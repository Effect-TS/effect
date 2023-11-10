import { Equal } from "effect"
import type { Equivalence } from "effect/Equivalence"

export const equivalentElements = <A>(): Equivalence<A> => (x, y) => {
  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.length === y.length) {
      return x.every((v, i) => Equal.equals(v, y[i]))
    }
  }
  return Equal.equals(x, y)
}
