import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Transduce a stream using a chunk processing function.
 *
 * @tsplus static effect/core/stream/Stream.Ops transducePush
 * @category mutations
 * @since 1.0.0
 */
export function transducePush<R2, R3, E2, In, Out>(
  push: Effect<
    R2 | Scope,
    never,
    (input: Option.Option<Chunk<In>>) => Effect<R3, E2, Chunk<Out>>
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
    > = Channel.unwrapScoped(push.map((push) => pull(push)))
    concreteStream(stream)
    return new StreamInternal(stream.channel.pipeTo(channel))
  }
}

function pull<R, E, E2, In, Out>(
  push: (input: Option.Option<Chunk<In>>) => Effect<R, E2, Chunk<Out>>
): Channel<R, E, Chunk<In>, unknown, E | E2, Chunk<Out>, unknown> {
  return Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(push(Option.some(input)))
        .flatMap((out) => Channel.write(out))
        .flatMap(() => pull<R, E, E2, In, Out>(push)),
    (err) => Channel.fail(err),
    () => Channel.fromEffect(push(Option.none)).flatMap((out) => Channel.write(out))
  )
}
