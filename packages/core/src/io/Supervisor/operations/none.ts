import { Effect } from "../../Effect"
import type { Supervisor } from "../definition"
import { ConstSupervisor } from "./_internal"

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @tsplus static ets/SupervisorOps none
 */
export const none: Supervisor<void> = new ConstSupervisor(Effect.unit)
