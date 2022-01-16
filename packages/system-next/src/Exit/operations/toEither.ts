// ets_tracing: off

import { FiberFailure } from "../../Cause/errors"
import * as E from "../../Either"
import type { Exit } from "../definition"

/**
 * Converts the `Exit` to an `Either<FiberFailure<E>, A>`, by wrapping the
 * cause in `FiberFailure` (if the result is failed).
 */
export function toEither<E, A>(self: Exit<E, A>): E.Either<FiberFailure<E>, A> {
  switch (self._tag) {
    case "Failure":
      return E.left(new FiberFailure(self.cause))
    case "Success":
      return E.right(self.value)
  }
}
