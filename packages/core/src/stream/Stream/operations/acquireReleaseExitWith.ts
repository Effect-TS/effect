import type { LazyArg } from "../../../data/Function"
import type { RIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import { Stream } from "../definition"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @tsplus static ets/StreamOps acquireReleaseExitWith
 */
export function acquireReleaseExitWith<R, E, A, R2, Z>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<unknown, unknown>) => RIO<R2, Z>,
  __tsplusTrace?: string
): Stream<R & R2, E, A> {
  return Stream.scoped(Effect.acquireReleaseExit(acquire, release))
}
