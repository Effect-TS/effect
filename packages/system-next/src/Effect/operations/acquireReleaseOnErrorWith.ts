import type { Exit } from "../../Exit/definition"
import type { Effect } from "../definition"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"
import { unit } from "./unit"

/**
 * Executes the release effect only if there was an error.
 */
export function acquireReleaseOnErrorWith_<R, E, A, E1, R1, A1, R2, E2, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return acquireReleaseExitWith_(
    acquire,
    use,
    (a, e): Effect<R2, E2, X | void> => (e._tag === "Success" ? unit : release(a, e)),
    __trace
  )
}

/**
 * Executes the release effect only if there was an error.
 *
 * @ets_data_first acquireReleaseOnErrorWith_
 */
export function acquireReleaseOnErrorWith<E, A, E1, R1, A1, R2, E2, X>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R>(acquire: Effect<R, E, A>) =>
    acquireReleaseOnErrorWith_(acquire, use, release, __trace)
}
