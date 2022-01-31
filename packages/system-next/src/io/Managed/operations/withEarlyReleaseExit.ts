import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import { Managed } from "../definition"

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 *
 * @ets fluent ets/Managed withEarlyReleaseExit
 */
export function withEarlyReleaseExit_<R, E, A>(
  self: Managed<R, E, A>,
  exit: Exit<any, any>,
  __etsTrace?: string
): Managed<R, E, Tuple<[UIO<any>, A]>> {
  return Managed(
    self.effect.map(({ tuple: [finalizer, a] }) =>
      Tuple(finalizer, Tuple(finalizer(exit).uninterruptible(), a))
    )
  )
}

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 *
 * @ets_data_first withEarlyReleaseExit_
 */
export function withEarlyReleaseExit(exit: Exit<any, any>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Tuple<[UIO<any>, A]>> =>
    withEarlyReleaseExit_(self, exit)
}
