import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Zips each element with the next element if present.
 *
 * @tsplus getter effect/core/stream/Stream zipWithNext
 * @category zipping
 * @since 1.0.0
 */
export function zipWithNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, readonly [A, Option.Option<A>]> {
  concreteStream(self)
  return new StreamInternal(self.channel >> process<E, A>(Option.none))
}

function process<E, A>(
  last: Option.Option<A>
): Channel<
  never,
  E,
  Chunk.Chunk<A>,
  unknown,
  E,
  Chunk.Chunk<readonly [A, Option.Option<A>]>,
  void
> {
  return Channel.readWith(
    (input: Chunk.Chunk<A>) => {
      const [newLast, chunk] = pipe(
        input,
        Chunk.mapAccum(
          last,
          (prev, curr) =>
            [
              Option.some(curr),
              pipe(prev, Option.map((a) => [a, curr] as const))
            ] as const
        )
      )
      const out = pipe(
        chunk,
        Chunk.filterMap((option) =>
          Option.isSome(option)
            ? Option.some([option.value[0], Option.some(option.value[1])] as const)
            : Option.none
        )
      )
      return Channel.write(out).flatMap(() => process<E, A>(newLast))
    },
    (err: E) => Channel.fail(err),
    () => {
      switch (last._tag) {
        case "None": {
          return Channel.unit
        }
        case "Some": {
          return Channel.write(Chunk.single([last.value, Option.none] as const)).flatMap(() =>
            Channel.unit
          )
        }
      }
    }
  )
}
