import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static ets/Stream/Ops unfoldChunk
 */
export function unfoldChunk<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Option<Tuple<[Chunk<A>, S]>>,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Option<Tuple<[Chunk<A>, S]>>,
  __tsplusTrace?: string
): Channel<never, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  return f(s()).fold(
    Channel.unit,
    ({ tuple: [as, s] }) => Channel.write(as) > loop(s, f)
  )
}
