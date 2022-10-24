import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * A fiber that never fails or succeeds.
 *
 * @tsplus static effect/core/io/Fiber.Ops never
 * @category constructors
 * @since 1.0.0
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: Effect.never,
  children: Effect.succeed(Chunk.empty),
  inheritAll: Effect.never,
  poll: Effect.succeed(Option.none),
  interruptAsFork: () => Effect.never
})
