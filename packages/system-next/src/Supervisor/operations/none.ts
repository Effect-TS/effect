// ets_tracing: off

import { unit } from "../../Effect"
import type { Supervisor } from "../definition"
import { ConstSupervisor } from "./_internal"

/**
 * A supervisor that doesn't do anything in response to supervision events.
 */
export const none: Supervisor<void> = new ConstSupervisor(unit)
