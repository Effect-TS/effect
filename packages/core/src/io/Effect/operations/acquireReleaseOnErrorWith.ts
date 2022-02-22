import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../Exit/definition"
import { Effect } from "../definition"

/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus static ets/EffectOps acquireReleaseOnErrorWith
 */
export function acquireReleaseOnErrorWith<R, E, A, E1, R1, A1, R2, E2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseExitWith(
    acquire,
    use,
    (a, e): Effect<R2, E2, X | void> =>
      e._tag === "Success" ? Effect.unit : release(a, e)
  )
}

/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus fluent ets/Effect acquireReleaseOnErrorWith
 */
export function acquireReleaseOnErrorWithNow_<R, E, A, E1, R1, A1, R2, E2, X>(
  self: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseOnErrorWith(self, use, release)
}

/**
 * Executes the release effect only if there was an error.
 *
 * @ets_data_first acquireReleaseOnErrorWithNow_
 */
export function acquireReleaseOnErrorWithNow<E, A, E1, R1, A1, R2, E2, X>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>) => self.acquireReleaseOnErrorWith(use, release)
}
