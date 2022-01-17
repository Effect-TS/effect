import * as Cause from "../../Cause/definition"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: Managed<unknown, never, never> = fromEffect(
  T.chain_(T.descriptor, (d) => T.failCause(Cause.interrupt(d.id)))
)
