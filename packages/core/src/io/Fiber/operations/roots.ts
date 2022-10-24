import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 *
 * @tsplus static effect/core/io/Fiber.Ops roots
 * @category constructors
 * @since 1.0.0
 */
export const roots: Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>> = Effect.sync(
  Chunk.fromIterable(FiberScope._roots)
)
