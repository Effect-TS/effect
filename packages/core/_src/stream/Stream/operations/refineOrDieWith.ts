import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/Stream refineOrDieWith
 */
export function refineOrDieWith_<R, E, E2, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => Maybe<E2>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.catchAll((e) => pf(e).fold(Channel.failCause(Cause.die(f(e))), (e2) => Channel.fail(e2)))
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static ets/Stream/Aspects refineOrDieWith
 */
export const refineOrDieWith = Pipeable(refineOrDieWith_)
