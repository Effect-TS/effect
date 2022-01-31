import type { Exit } from "../../Exit/definition"
import { Effect } from "../definition"

/**
 * Executes the release effect only if there was an error.
 *
 * @ets fluent ets/Effect acquireReleaseOnErrorWith
 */
export function acquireReleaseOnErrorWith_<R, E, A, E1, R1, A1, R2, E2, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return acquire.acquireReleaseExitWith(
    use,
    (a, e): Effect<R2, E2, X | void> =>
      e._tag === "Success" ? Effect.unit : release(a, e)
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
  __etsTrace?: string
) {
  return <R>(acquire: Effect<R, E, A>) =>
    acquireReleaseOnErrorWith_(acquire, use, release)
}
