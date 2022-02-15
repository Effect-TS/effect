import type { LazyArg } from "../../../data/Function"
import { Cause } from "../../Cause"
import type { Exit } from "../../Exit"
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
export function acquireReleaseExitWith<R, E, A, R1, E1, A1, R2, E2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.uninterruptibleMask(({ restore }) =>
    acquire().flatMap((a) =>
      Effect.suspendSucceed(restore(use(a)))
        .exit()
        .flatMap((exit) =>
          Effect.suspendSucceed(release(a, exit)).foldCauseEffect(
            (cause2) =>
              Effect.failCauseNow(
                exit.fold(
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
 * @tsplus fluent ets/Effect acquireReleaseExitWith
 */
export function acquireReleaseExitWithNow_<R, E, A, R1, E1, A1, R2, E2, X>(
  self: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseExitWith(self, use, release)
}

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @ets_data_first acquireReleaseExitWithNow_
 */
export function acquireReleaseExitWithNow<A, R1, E1, A1, R2, E2, X>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    self.acquireReleaseExitWith(use, release)
}
