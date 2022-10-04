import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Zips each element with the next element if present.
 *
 * @tsplus getter effect/core/stream/Stream zipWithNext
 */
export function zipWithNext<R, E, A>(self: Stream<R, E, A>): Stream<R, E, readonly [A, Maybe<A>]> {
  concreteStream(self)
  return new StreamInternal(self.channel >> process<E, A>(Maybe.none))
}

function process<E, A>(
  last: Maybe<A>
): Channel<never, E, Chunk<A>, unknown, E, Chunk<readonly [A, Maybe<A>]>, void> {
  return Channel.readWith(
    (input: Chunk<A>) => {
      const [newLast, chunk] = input.mapAccum(
        last,
        (prev, curr) => [Maybe.some(curr), prev.map((a) => [a, curr] as const)] as const
      )
      const out = chunk.collect((option) =>
        option.isSome()
          ? Maybe.some([option.value[0], Maybe.some(option.value[1])] as const)
          : Maybe.none
      )
      return Channel.write(out).flatMap(() => process<E, A>(newLast))
    },
    (err: E) => Channel.fail(err),
    () =>
      last.fold(
        Channel.unit,
        (a) => Channel.write(Chunk.single([a, Maybe.none] as const)).flatMap(() => Channel.unit)
      )
  )
}
