import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @tsplus static effect/core/stream/Stream.Aspects groupAdjacentBy
 * @tsplus pipeable effect/core/stream/Stream groupAdjacentBy
 * @category grouping
 * @since 1.0.0
 */
export function groupAdjacentBy<A, K>(f: (a: A) => K) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, readonly [K, Chunk.Chunk<A>]> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> chunkAdjacent<E, A, K>(Option.none, f))
  }
}

function chunkAdjacent<E, A, K>(
  buffer: Option.Option<readonly [K, Chunk.Chunk<A>]>,
  f: (a: A) => K
): Channel<
  never,
  E,
  Chunk.Chunk<A>,
  unknown,
  E,
  Chunk.Chunk<readonly [K, Chunk.Chunk<A>]>,
  unknown
> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => {
      const [outputs, newBuffer] = go(chunk, buffer, f)
      return Channel.write(outputs).flatMap(() => chunkAdjacent<E, A, K>(newBuffer, f))
    },
    (cause) => Channel.failCause(cause),
    () => {
      switch (buffer._tag) {
        case "None": {
          return Channel.unit
        }
        case "Some": {
          return Channel.write(Chunk.single(buffer.value))
        }
      }
    }
  )
}

function go<A, K>(
  input: Chunk.Chunk<A>,
  state: Option.Option<readonly [K, Chunk.Chunk<A>]>,
  f: (a: A) => K
): readonly [
  Chunk.Chunk<readonly [K, Chunk.Chunk<A>]>,
  Option.Option<readonly [K, Chunk.Chunk<A>]>
] {
  return pipe(
    input,
    Chunk.reduce(
      [Chunk.empty as Chunk.Chunk<readonly [K, Chunk.Chunk<A>]>, state] as const,
      ([os, o], a) => {
        switch (o._tag) {
          case "None": {
            return [
              os,
              Option.some([f(a), Chunk.single(a)] as const)
            ] as const
          }
          case "Some": {
            const k2 = f(a)
            const [k, aggregated] = o.value
            if (k === k2) {
              return [
                os,
                Option.some([k, pipe(aggregated, Chunk.append(a))] as const)
              ] as const
            } else {
              return [
                pipe(os, Chunk.append(o.value)),
                Option.some([k2, Chunk.single(a)] as const)
              ] as const
            }
          }
        }
      }
    )
  )
}
