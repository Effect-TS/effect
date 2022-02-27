import type { UIO } from "../../Effect"
import type { Supervisor } from "../definition"
import { ConstSupervisor } from "./_internal"

/**
 * @tsplus static ets/SupervisorOps fromEffect
 */
export function fromEffect<A>(effect: UIO<A>): Supervisor<A> {
  return new ConstSupervisor(effect)
}
