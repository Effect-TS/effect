/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 *
 * @tsplus static ets/Fiber/Ops roots
 */
export const roots: Effect.UIO<Chunk<Fiber.Runtime<any, any>>> = Effect.succeed(() =>
  Chunk.from(FiberScope._roots.value)
)
