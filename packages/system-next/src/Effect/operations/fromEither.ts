import type { Either } from "../../Either"
import { fold } from "../../Either"
import type { LazyArg } from "../../Function"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @ets static ets/EffectOps fromEither
 */
export function fromEither<E, A>(
  f: LazyArg<Either<E, A>>,
  __trace?: string
): Effect<unknown, E, A> {
  return chain_(succeed(f), fold(failNow, succeedNow), __trace)
}
