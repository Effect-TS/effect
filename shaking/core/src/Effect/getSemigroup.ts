import { Semigroup } from "fp-ts/lib/Semigroup"

import { Effect } from "../Support/Common/effect"

import { zipWith_ } from "./zipWith"

export function getSemigroup<S, R, E, A>(
  s: Semigroup<A>
): Semigroup<Effect<S, R, E, A>> {
  return {
    concat(x: Effect<S, R, E, A>, y: Effect<S, R, E, A>): Effect<S, R, E, A> {
      return zipWith_(x, y, s.concat)
    }
  }
}
