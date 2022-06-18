import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * A fiber that never fails or succeeds.
 *
 * @tsplus static ets/Fiber/Ops never
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: Effect.never,
  children: Effect.succeedNow(Chunk.empty()),
  inheritRefs: Effect.never,
  poll: Effect.succeedNow(Maybe.none),
  interruptAs: () => Effect.never
})
