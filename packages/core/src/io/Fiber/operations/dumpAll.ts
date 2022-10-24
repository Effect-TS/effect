import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/io/Fiber.Ops dumpAll
 * @category destructors
 * @since 1.0.0
 */
export function dumpAll(
  fibers: Iterable<Fiber.Runtime<unknown, unknown>>
): Effect<never, never, Chunk<Fiber.Dump>> {
  return Effect.forEach(fibers, (fiber) => fiber.dump)
}
