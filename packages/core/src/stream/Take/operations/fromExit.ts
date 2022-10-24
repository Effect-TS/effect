import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a `Take<E, A>` from `Exit<E, A>`.
 *
 * @tsplus static effect/core/stream/Take.Ops done
 * @category conversions
 * @since 1.0.0
 */
export function fromExit<E, A>(exit: Exit<E, A>): Take<E, A> {
  return new TakeInternal(exit.mapBoth(Option.some, Chunk.single))
}
