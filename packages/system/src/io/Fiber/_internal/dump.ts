import type { Trace } from "../../../io/Trace"
import type { FiberId } from "../../FiberId/definition"
import type { Status } from "../status"

export class Dump {
  constructor(
    readonly fiberId: FiberId,
    readonly status: Status,
    readonly trace: Trace
  ) {}
}
