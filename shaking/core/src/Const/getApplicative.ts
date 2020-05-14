import type { Applicative2C } from "fp-ts/lib/Applicative"

import type { Monoid } from "../Monoid"

import { URI } from "./URI"
import { getApply } from "./getApply"
import { make } from "./make"

/**
 * @since 2.0.0
 */
export function getApplicative<E>(M: Monoid<E>): Applicative2C<URI, E> {
  return {
    ...getApply(M),
    of: () => make(M.empty)
  }
}
