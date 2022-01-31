import * as Cause from "../../Cause"
import type { Exit } from "../../Exit"
import { fold_ } from "../../Exit/operations/fold"
import { Effect } from "../definition"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @ets fluent ets/Effect acquireReleaseExitWith
 */
export function acquireReleaseExitWith_<R, E, A, R1, E1, A1, R2, E2, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.uninterruptibleMask(({ restore }) =>
    acquire.flatMap((a) =>
      Effect.suspendSucceed(() => restore(use(a)))
        .exit()
        .flatMap((exit) =>
          Effect.suspendSucceed(() => release(a, exit)).foldCauseEffect(
            (cause2) =>
              Effect.failCauseNow(
                fold_(
                  exit,
                  (cause1) => Cause.then(cause1, cause2),
                  () => cause2
                )
              ),
            () => Effect.done(exit)
          )
        )
    )
  )
}

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @ets_data_first acquireReleaseExitWith_
 */
export function acquireReleaseExitWith<A, R1, E1, A1, R2, E2, X>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    acquireReleaseExitWith_(acquire, use, release)
}
