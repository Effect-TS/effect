import type { FiberStatus } from "@effect-ts/core/io/Fiber/status";

export class Dump {
  constructor(
    readonly fiberId: FiberId,
    readonly status: FiberStatus,
    readonly trace: Trace
  ) {}
}
