import { Monoid } from "fp-ts/lib/Monoid"

import { Effect } from "../Support/Common/effect"

import { getSemigroup } from "./getSemigroup"
import { pure } from "./pure"

export function getMonoid<S, R, E, A>(m: Monoid<A>): Monoid<Effect<S, R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  }
}
