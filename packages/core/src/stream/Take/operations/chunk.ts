import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Creates a `Take<never, A>` with the specified chunk.
 *
 * @tsplus static effect/core/stream/Take.Ops chunk
 */
export function chunk<A>(chunk: Chunk<A>): Take<never, A> {
  return new TakeInternal(Exit.succeed(chunk))
}
