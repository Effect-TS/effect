// ets_tracing: off

import type { FiberId } from "../FiberId"
import type { Trace } from "../Trace"
import type { Status } from "./status"

export class Dump {
  constructor(
    readonly fiberId: FiberId,
    readonly status: Status,
    readonly trace: Trace
  ) {}
}
