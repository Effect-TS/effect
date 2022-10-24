import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Splits elements based on a predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects split
 * @tsplus pipeable effect/core/stream/Stream split
 * @category mutations
 * @since 1.0.0
 */
export function split<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, Chunk.Chunk<A>> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> loop<R, E, A>(Chunk.empty, f))
  }
}

function splitInternal<R, E, A>(
  leftovers: Chunk.Chunk<A>,
  input: Chunk.Chunk<A>,
  f: Predicate<A>
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> {
  const [chunk, remaining] = pipe(leftovers, Chunk.concat(input), Chunk.splitWhere(f))
  return Chunk.isEmpty(chunk) || Chunk.isEmpty(remaining)
    ? loop<R, E, A>(pipe(chunk, Chunk.concat(remaining), Chunk.drop(1)), f)
    : Channel.write(Chunk.single(chunk)).flatMap(() =>
      splitInternal<R, E, A>(Chunk.empty, pipe(remaining, Chunk.drop(1)), f)
    )
}

function loop<R, E, A>(
  leftovers: Chunk.Chunk<A>,
  f: Predicate<A>
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> {
  return Channel.readWith(
    (input: Chunk.Chunk<A>) => splitInternal<R, E, A>(leftovers, input, f),
    (err) => Channel.fail(err),
    () =>
      Chunk.isEmpty(leftovers)
        ? Channel.unit
        : pipe(leftovers, Chunk.findFirst(f), Option.isNone)
        ? Channel.write(Chunk.single(leftovers)).flatMap(() => Channel.unit)
        : splitInternal<R, E, A>(Chunk.empty, leftovers, f).flatMap(() => Channel.unit)
  )
}
