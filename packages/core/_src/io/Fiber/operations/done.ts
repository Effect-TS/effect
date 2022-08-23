import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * A fiber that is done with the specified `Exit` value.
 *
 * @tsplus static effect/core/io/Fiber.Ops done
 */
export function done<E, A>(exit: Exit<E, A>): Fiber<E, A> {
  return makeSynthetic({
    id: FiberId.none,
    await: Effect.succeed(exit),
    children: Effect.succeed(Chunk.empty()),
    inheritAll: Effect.unit,
    poll: Effect.succeed(Maybe.some(exit)),
    interruptAsFork: () => Effect.unit
  })
}
