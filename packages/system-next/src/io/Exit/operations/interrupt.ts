import { Cause } from "../../Cause"
import type { FiberId } from "../../FiberId"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

export function interrupt(fiberId: FiberId): Exit<never, never> {
  return failCause(Cause.interrupt(fiberId))
}
