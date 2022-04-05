import { ConstSupervisor } from "@effect-ts/core/io/Supervisor/operations/const";

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @tsplus static ets/Supervisor/Ops none
 */
export const none: Supervisor<void> = new ConstSupervisor(Effect.unit);
