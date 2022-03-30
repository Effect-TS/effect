import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Promise } from "../../../io/Promise"
import { Stream } from "../../Stream"

/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @tsplus fluent ets/Stream drainFork
 */
export function drainFork_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  other: LazyArg<Stream<R2, E2, Z>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  return Stream.fromEffect(Promise.make<E | E2, never>()).flatMap(
    (backgroundDied) =>
      Stream.scoped(
        other()
          .runForEachScoped(() => Effect.unit)
          .catchAllCause((cause) => backgroundDied.failCause(cause))
          .forkScoped()
      ) > self.interruptWhenPromise(backgroundDied)
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 */
export const drainFork = Pipeable(drainFork_)
