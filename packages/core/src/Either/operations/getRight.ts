// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import * as O from "../../Option/index.js"

/**
 * Gets Right as Option
 */
export function getRight<E, A>(self: Either<E, A>): O.Option<A> {
  return self._tag === "Right" ? O.some(self.right) : O.none
}

/**
 * Gets Right
 */
export function unsafeGetRight<E, A>(self: Either<E, A>): A | undefined {
  return self._tag === "Right" ? self.right : void 0
}
