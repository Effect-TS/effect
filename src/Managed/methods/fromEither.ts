import * as E from "../../Either"
import { fail } from "../core"
import { succeed } from "../succeed"
import { suspend } from "./suspend"

/**
 * Lifts an `Either` into a `Managed` value.
 */
export function fromEither<E, A>(self: E.Either<E, A>) {
  return suspend(() => (self._tag === "Left" ? fail(self.left) : succeed(self.right)))
}
