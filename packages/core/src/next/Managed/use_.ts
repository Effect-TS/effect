import { tuple } from "../../Function"

import * as T from "./deps"
import { internalEffect, releaseAll } from "./internals"
import { Managed } from "./managed"
import { makeReleaseMap } from "./releaseMap"

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use_ = <S, R, E, A, S2, R2, E2, B>(
  self: Managed<S, R, E, A>,
  f: (a: A) => T.Effect<S2, R2, E2, B>
): T.Effect<S | S2, R & R2, E | E2, B> => {
  return T.bracketExit_(
    makeReleaseMap,
    (rm) =>
      T.chain_(
        T.provideSome_(internalEffect(self), (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    (rm, ex) => releaseAll<S, E>(rm, ex)
  )
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow = <S, R, E, A>(self: Managed<S, R, E, A>) =>
  use_(self, T.succeedNow)
