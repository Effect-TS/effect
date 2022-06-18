import { ConstSupervisor } from "@effect/core/io/Supervisor/operations/const"

/**
 * @tsplus static ets/SupervisorOps fromEffect
 */
export function fromEffect<A>(effect: Effect<never, never, A>): Supervisor<A> {
  return new ConstSupervisor(effect)
}
