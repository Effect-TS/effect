import type { Cause } from "../../Cause"
import type { Either } from "../../Either"
import { fold } from "../../Either"
import type { IO } from "../definition"
import { chain_ } from "./chain"
import { failCause } from "./failCause"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

// TODO(Mike/Max): make lazy

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @ets static ets/EffectOps fromEitherCause
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
