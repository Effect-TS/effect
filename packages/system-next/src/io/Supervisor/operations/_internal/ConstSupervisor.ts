import { constVoid } from "../../../../data/Function"
import type { UIO } from "../../../Effect"
import { Supervisor } from "../../definition"

export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(value: UIO<A>) {
    super(value, constVoid, constVoid)
  }
}
