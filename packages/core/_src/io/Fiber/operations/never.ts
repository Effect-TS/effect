import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * A fiber that never fails or succeeds.
 *
 * @tsplus static effect/core/io/Fiber.Ops never
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: Effect.never,
  children: Effect.succeed(Chunk.empty()),
  inheritAll: Effect.never,
  poll: Effect.succeed(Maybe.none),
  interruptAsFork: () => Effect.never
})
