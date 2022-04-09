import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static ets/Stream/Ops paginateChunk
 */
export function paginateChunk<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Tuple<[Chunk<A>, Option<S>]>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)));
}

function loop<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Tuple<[Chunk<A>, Option<S>]>,
  __tsplusTrace?: string
): Channel<unknown, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  const {
    tuple: [as, maybeS]
  } = f(s());
  return maybeS.fold(
    Channel.write(as) > Channel.unit,
    (s) => Channel.write(as) > loop(s, f)
  );
}
