import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Zips each element with the next element if present.
 *
 * @tsplus fluent ets/Stream zipWithNext
 */
export function zipWithNext<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[A, Option<A>]>> {
  concreteStream(self)
  return new StreamInternal(self.channel >> process<E, A>(Option.none))
}

function process<E, A>(
  last: Option<A>,
  __tsplusTrace?: string
): Channel<unknown, E, Chunk<A>, unknown, E, Chunk<Tuple<[A, Option<A>]>>, void> {
  return Channel.readWith(
    (input: Chunk<A>) => {
      const {
        tuple: [newLast, chunk]
      } = input.mapAccum(last, (prev, curr) =>
        Tuple(
          Option.some(curr),
          prev.map((a) => Tuple(a, curr))
        ))
      const out = chunk.collect((option) =>
        option.isSome()
          ? Option.some(Tuple(option.value.get(0), Option.some(option.value.get(1))))
          : Option.none
      )
      return Channel.write(out) > process<E, A>(newLast)
    },
    (err: E) => Channel.fail(err),
    () =>
      last.fold(
        Channel.unit,
        (a) => Channel.write(Chunk.single(Tuple(a, Option.none))) > Channel.unit
      )
  )
}
