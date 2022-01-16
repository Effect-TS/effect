// ets_tracing: off

import type { UIO } from "../../../Effect"
import { constVoid } from "../../../Function"
import { Supervisor } from "../../definition"

export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(value: UIO<A>) {
    super(value, constVoid, constVoid)
  }
}
