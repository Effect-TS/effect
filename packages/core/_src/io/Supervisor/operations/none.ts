import { ConstSupervisor } from "@effect/core/io/Supervisor/operations/const"

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @tsplus static effect/core/io/Supervisor.Ops none
 */
export const none: Supervisor<void> = new ConstSupervisor(Effect.unit)
