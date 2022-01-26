import type { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { interrupt as exitInterrupt } from "../../Exit/operations/interrupt"
import { Managed } from "../definition"

/**
 * Modifies this `Managed` to provide a canceler that can be used to eagerly
 * execute the finalizer of this `Managed`. The canceler will run
 * uninterruptibly with an exit value indicating that the effect was
 * interrupted, and if completed will cause the regular finalizer to not run.
 *
 * @ets fluent ets/Managed withEarlyRelease
 */
export function withEarlyRelease<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, Tuple<[UIO<any>, A]>> {
  return Managed.fiberId.flatMap((id) => self.withEarlyReleaseExit(exitInterrupt(id)))
}
