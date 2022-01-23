import * as Tp from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"
import type { Exit } from "./_internal/exit"

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 */
export function withEarlyReleaseExit_<R, E, A>(
  self: Managed<R, E, A>,
  exit: Exit<any, any>,
  __trace?: string
): Managed<R, E, Tp.Tuple<[T.UIO<any>, A]>> {
  return managedApply(
    T.map_(
      self.effect,
      ({ tuple: [finalizer, a] }) =>
        Tp.tuple(finalizer, Tp.tuple(T.uninterruptible(finalizer(exit)), a)),
      __trace
    )
  )
}

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 *
 * @ets_data_first withEarlyReleaseExit_
 */
export function withEarlyReleaseExit(exit: Exit<any, any>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Tp.Tuple<[T.UIO<any>, A]>> =>
    withEarlyReleaseExit_(self, exit, __trace)
}
