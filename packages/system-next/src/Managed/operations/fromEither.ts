import type { Either } from "../../Either"
import { fold } from "../../Either"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Either` into a `Managed` value.
 */
export function fromEither<E, A>(
  either: Either<E, A>,
  __trace?: string
): Managed<unknown, E, A> {
  return chain_(
    succeed(() => either),
    fold(failNow, succeedNow),
    __trace
  )
}
