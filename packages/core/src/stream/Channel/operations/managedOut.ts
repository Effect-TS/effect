import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { ExecutionStrategy } from "../../../io/ExecutionStrategy"
import { Exit } from "../../../io/Exit"
import { Managed } from "../../../io/Managed"
import { ReleaseMap } from "../../../io/Managed/ReleaseMap"
import { Channel } from "../definition"

/**
 * Use a managed to emit an output element.
 *
 * @tsplus static ets/ChannelOps managedOut
 */
export function managedOut<R, E, A>(
  managed: LazyArg<Managed<R, E, A>>
): Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return Channel.acquireReleaseOutExitWith(
    ReleaseMap.make.flatMap((releaseMap) =>
      Effect.uninterruptibleMask(({ restore }) =>
        restore(managed().effect)
          .apply(Managed.currentReleaseMap.value.locally(releaseMap))
          .foldCauseEffect(
            (cause) =>
              releaseMap.releaseAll(
                Exit.failCause(cause),
                ExecutionStrategy.Sequential
              ) > Effect.failCause(cause),
            (tuple) => Effect.succeedNow(Tuple(tuple.get(1), releaseMap))
          )
      )
    ),
    ({ tuple: [_, releaseMap] }, exit) =>
      releaseMap.releaseAll(exit, ExecutionStrategy.Sequential)
  ).mapOut(({ tuple: [a, _] }) => a)
}
