// ets_tracing: off

import type { UIO } from "../../Effect"
import type { Supervisor } from "../definition"
import { ConstSupervisor } from "./_internal"

export function fromEffect<A>(effect: UIO<A>): Supervisor<A> {
  return new ConstSupervisor(effect)
}
