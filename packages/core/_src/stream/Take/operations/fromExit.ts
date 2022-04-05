import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Creates a `Take<E, A>` from `Exit<E, A>`.
 *
 * @tsplus static ets/Take/Ops done
 */
export function fromExit<E, A>(exit: Exit<E, A>): Take<E, A> {
  return new TakeInternal(exit.mapBoth(Option.some, Chunk.single));
}
