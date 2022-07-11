/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 *
 * @tsplus static effect/core/io/Fiber.Ops roots
 */
export const roots: Effect<never, never, Chunk<Fiber.Runtime<any, any>>> = Effect.succeed(Chunk.from(FiberScope._roots))
