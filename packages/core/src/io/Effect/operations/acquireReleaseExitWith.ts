import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../Exit"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @tsplus static ets/EffectOps acquireReleaseExitWith
 */
export function acquireReleaseExitWith<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A, e: Exit<E2, A2>) => RIO<R3, X>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E | E2, A2> {
  return Effect.uninterruptibleMask(({ restore }) =>
    acquire().flatMap((a) =>
      Effect.suspendSucceed(restore(use(a)))
        .exit()
        .flatMap((exit) =>
          Effect.suspendSucceed(release(a, exit)).foldCauseEffect(
            (cause2) =>
              Effect.failCause(
                exit.fold(
                  (cause1) => cause1 + cause2,
                  () => cause2
                )
              ),
            () => Effect.done(exit)
          )
        )
    )
  )
}
