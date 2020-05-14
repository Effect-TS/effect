import type { Apply2C } from "fp-ts/lib/Apply"

import type { Semigroup } from "../Semigroup"

import { URI } from "./URI"
import { const_ } from "./instances"
import { make } from "./make"

/**
 * @since 2.0.0
 */
export function getApply<E>(S: Semigroup<E>): Apply2C<URI, E> {
  return {
    URI,
    _E: undefined as any,
    map: const_.map,
    ap: (fab, fa) => make(S.concat(fab, fa))
  }
}
