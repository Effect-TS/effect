import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * A fiber that is done with the specified `Exit` value.
 *
 * @tsplus static effect/core/io/Fiber.Ops done
 * @category constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): Fiber<E, A> {
  return makeSynthetic({
    id: FiberId.none,
    await: Effect.succeed(exit),
    children: Effect.succeed(Chunk.empty),
    inheritAll: Effect.unit,
    poll: Effect.succeed(Option.some(exit)),
    interruptAsFork: () => Effect.unit
  })
}
