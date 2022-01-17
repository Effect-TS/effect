import * as Cause from "../../Cause"
import type { Exit } from "../../Exit"
import { fold_ } from "../../Exit/operations/fold"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { done } from "./done"
import { exit } from "./exit"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { uninterruptibleMask } from "./interruption"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 */
export function acquireReleaseExitWith_<R, E, A, R1, E1, A1, R2, E2, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return uninterruptibleMask(
    (status) =>
      chain_(acquire, (a) =>
        chain_(exit(suspendSucceed(() => status.restore(use(a)))), (exit) =>
          foldCauseEffect_(
            suspendSucceed(() => release(a, exit)),
            (cause2) =>
              failCause(
                fold_(
                  exit,
                  (cause1) => Cause.then(cause1, cause2),
                  () => cause2
                )
              ),
            () => done(exit)
          )
        )
      ),
    __trace
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
  __trace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    acquireReleaseExitWith_(acquire, use, release, __trace)
}
