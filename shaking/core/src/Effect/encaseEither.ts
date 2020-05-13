import type { Either } from "../Either/Either"
import { IPureEither } from "../Support/Common"
import type { SyncE } from "../Support/Common/effect"

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Either<E, A>): SyncE<E, A> {
  return new IPureEither(e) as any
}
