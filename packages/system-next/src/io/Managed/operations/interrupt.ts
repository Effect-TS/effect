import * as Cause from "../../Cause/definition"
import { Effect } from "../../Effect"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that is interrupted as if by the fiber calling this
 * method.
 *
 * @tsplus static ets/ManagedOps interrupt
 */
export const interrupt: Managed<unknown, never, never> = fromEffect(
  Effect.descriptor.flatMap((d) => Effect.failCauseNow(Cause.interrupt(d.id)))
)
