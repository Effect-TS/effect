import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink from a chunk processing function.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromPush
 */
export function fromPush<R, E, In, L, Z>(
  push: Effect<
    R | Scope,
    never,
    (input: Maybe<Chunk<In>>) => Effect<R, Tuple<[Either<E, Z>, Chunk<L>]>, void>
  >
): Sink<R, E, In, L, Z> {
  return new SinkInternal(Channel.unwrapScoped(push.map(pull)))
}

function pull<R, E, In, L, Z>(
  push: (option: Maybe<Chunk<In>>) => Effect<R, Tuple<[Either<E, Z>, Chunk<L>]>, void>
): Channel<R, never, Chunk<In>, unknown, E, Chunk<L>, Z> {
  return Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(push(Maybe.some(input))).foldChannel(
        ({ tuple: [either, leftovers] }) =>
          either.fold(
            (e) => Channel.write(leftovers) > Channel.fail(e),
            (z) => Channel.write(leftovers) > Channel.succeed(z)
          ),
        () => pull(push)
      ),
    (err) => Channel.fail(() => err),
    () =>
      Channel.fromEffect(push(Maybe.none)).foldChannel(
        ({ tuple: [either, leftovers] }) =>
          either.fold(
            (e) => Channel.write(leftovers) > Channel.fail(e),
            (z) => Channel.write(leftovers) > Channel.succeed(z)
          ),
        () => Channel.fromEffect(Effect.dieMessage("empty sink"))
      )
  )
}
