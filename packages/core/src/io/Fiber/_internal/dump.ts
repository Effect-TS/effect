import type { FiberStatus } from "@effect/core/io/Fiber/status"

export interface FiberDump {
  readonly fiberId: FiberId.Runtime
  readonly fiberStatus: FiberStatus
}

export function FiberDump(
  fiberId: FiberId.Runtime,
  fiberStatus: Fiber.Status
): Fiber.Dump {
  return {
    fiberId,
    fiberStatus
  }
}
