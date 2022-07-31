import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transduce a stream using a chunk processing function.
 *
 * @tsplus static effect/core/stream/Stream.Ops transducePush
 */
export function transducePush<R2, R3, E2, In, Out>(
  push: LazyArg<
    Effect<
      R2 | Scope,
      never,
      (input: Maybe<Chunk<In>>) => Effect<R3, E2, Chunk<Out>>
    >
  >
) {
  return <R, E>(stream: Stream<R, E, In>): Stream<R | R2 | R3, E | E2, Out> => {
    const channel: Channel<
      R | R2 | R3,
      E,
      Chunk<In>,
      unknown,
      E | E2,
      Chunk<Out>,
      unknown
    > = Channel.unwrapScoped(push().map((push) => pull(push)))
    concreteStream(stream)
    return new StreamInternal(stream.channel >> channel)
  }
}

function pull<R, E, E2, In, Out>(
  push: (input: Maybe<Chunk<In>>) => Effect<R, E2, Chunk<Out>>
): Channel<R, E, Chunk<In>, unknown, E | E2, Chunk<Out>, unknown> {
  return Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(push(Maybe.some(input))).flatMap((out) => Channel.write(out)) >
        pull<R, E, E2, In, Out>(push),
    (err) => Channel.fail(err),
    () => Channel.fromEffect(push(Maybe.none)).flatMap((out) => Channel.write(out))
  )
}
