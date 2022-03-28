import type { Option } from "../../../data/Option"
import { Cause } from "../../../io/Cause"
import { Channel } from "../../Channel"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/Stream refineOrDieWith
 */
export function refineOrDieWith_<R, E, E2, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => Option<E2>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.catchAll((e) =>
      pf(e).fold(Channel.failCause(Cause.die(f(e))), (e2) => Channel.fail(e2))
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 */
export const refineOrDieWith = Pipeable(refineOrDieWith_)
