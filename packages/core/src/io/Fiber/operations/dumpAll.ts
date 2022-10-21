/**
 * @tsplus static effect/core/io/Fiber.Ops dumpAll
 */
export function dumpAll(
  fibers: Collection<Fiber.Runtime<unknown, unknown>>
): Effect<never, never, Chunk<Fiber.Dump>> {
  return Effect.forEach(fibers, (fiber) => fiber.dump)
}
