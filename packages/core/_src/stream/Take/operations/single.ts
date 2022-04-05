import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Creates a `Take<never, A>` with a singleton chunk.
 *
 * @tsplus static ets/Take/Ops single
 */
export function single<A>(a: A): Take<never, A> {
  return new TakeInternal(Exit.succeed(Chunk.single(a)));
}
