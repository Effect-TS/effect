// ets_tracing: off

import type { Either } from "../../Either"
import { fold } from "../../Either"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Either` into an `Effect` value.
 */
export function fromEither<E, A>(
  f: () => Either<E, A>,
  __trace?: string
): Effect<unknown, E, A> {
  return chain_(succeed(f), fold(failNow, succeedNow), __trace)
}
