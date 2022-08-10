import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfoldChunk
 */
export function unfoldChunk<S, A>(
  s: S,
  f: (s: S) => Maybe<Tuple<[Chunk<A>, S]>>
): Stream<never, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, A>(
  s: S,
  f: (s: S) => Maybe<Tuple<[Chunk<A>, S]>>
): Channel<never, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  return f(s).fold(
    Channel.unit,
    ({ tuple: [as, s] }) => Channel.write(as).flatMap(() => loop(s, f))
  )
}
