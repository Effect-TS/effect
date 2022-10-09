import { FiberDump } from "@effect/core/io/Fiber/_internal/dump"

/**
 * @tsplus static effect/core/io/Fiber.Ops dump
 * @tsplus getter effect/core/io/Fiber dump
 */
export function dump<E, A>(self: Fiber.Runtime<E, A>): Effect<never, never, Fiber.Dump> {
  return self.status.map((status) => FiberDump(self.id, status))
}
