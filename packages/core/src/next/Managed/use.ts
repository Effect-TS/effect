import * as T from "./deps"
import { Managed } from "./managed"
import { use_ } from "./use_"

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use = <A, S2, R2, E2, B>(f: (a: A) => T.Effect<S2, R2, E2, B>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
): T.Effect<S | S2, R & R2, E | E2, B> => use_(self, f)
