// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import * as O from "../../Option/index.js"

/**
 * Gets Left
 */
export function unsafeGetLeft<E, A>(self: Either<E, A>): E | undefined {
  return self._tag === "Left" ? self.left : void 0
}

/**
 * Gets Left as Option
 */
export function getLeft<E, A>(self: Either<E, A>): O.Option<E> {
  return self._tag === "Left" ? O.some(self.left) : O.none
}
