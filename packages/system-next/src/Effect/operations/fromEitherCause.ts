// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Either } from "../../Either"
import { fold } from "../../Either"
import type { IO } from "../definition"
import { chain_ } from "./chain"
import { failCause } from "./failCause"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Either` into an `Effect` value.
 */
export function fromEitherCause<E, A>(
  either: Either<Cause<E>, A>,
  __trace?: string
): IO<E, A> {
  return chain_(
    succeed(() => either),
    fold(failCause, succeedNow),
    __trace
  )
}
