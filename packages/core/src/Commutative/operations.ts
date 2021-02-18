import { instance } from "../Prelude"
import type { Commutative } from "./definition"

export function makeCommutative<A>(f: (r: A) => (l: A) => A): Commutative<A> {
  return instance<Commutative<A>>({
    combine: f,
    commute: (y) => (x) => f(x)(y)
  })
}
