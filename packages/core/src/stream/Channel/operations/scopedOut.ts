import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Exit } from "../../../io/Exit"
import type { HasScope } from "../../../io/Scope"
import { Scope } from "../../../io/Scope"
import { Channel } from "../definition"

/**
 * Use a managed to emit an output element.
 *
 * @tsplus static ets/ChannelOps scopedOut
 */
export function scopedOut<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, E, A>>
): Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return Channel.acquireReleaseOutExitWith(
    Scope.make.flatMap((scope) =>
      Effect.uninterruptibleMask(({ restore }) =>
        restore(scope.extend(effect)).foldCauseEffect(
          (cause) => scope.close(Exit.failCause(cause)) > Effect.failCause(cause),
          (out) => Effect.succeedNow(Tuple(out, scope))
        )
      )
    ),
    ({ tuple: [_, scope] }, exit) => scope.close(exit)
  ).mapOut((_) => _.get(0))
}
