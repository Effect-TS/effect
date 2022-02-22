import type { Trace } from "../../../io/Trace"
import type { FiberId } from "../../FiberId/definition"
import type { FiberStatus } from "../status"

export class Dump {
  constructor(
    readonly fiberId: FiberId,
    readonly status: FiberStatus,
    readonly trace: Trace
  ) {}
}
