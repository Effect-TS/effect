import type { FiberStatus } from "@effect/core/io/Fiber/status"

/** @internal */
export interface FiberDump {
  readonly fiberId: FiberId.Runtime
  readonly fiberStatus: FiberStatus
}

/** @internal */
export function FiberDump(
  fiberId: FiberId.Runtime,
  fiberStatus: Fiber.Status
): Fiber.Dump {
  return {
    fiberId,
    fiberStatus
  }
}
