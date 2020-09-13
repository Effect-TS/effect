import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Uses the output of `that` to provide to `self`
 */
export function compose<S2, R2, E2, R>(that: Effect<S2, R2, E2, R>) {
  return <S, E, A>(self: Effect<S, R, E, A>) =>
    chain_(that, (r) => provideAll_(self, r))
}
