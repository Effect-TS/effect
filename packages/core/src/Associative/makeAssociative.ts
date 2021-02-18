import { instance } from "../Prelude"
import type { Associative } from "./definition"

export function makeAssociative<A>(f: (r: A) => (l: A) => A): Associative<A> {
  return instance({
    combine: f
  })
}

export * from "./definition"
