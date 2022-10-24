import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each. The
 * last chunk might contain less than `n` elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects rechunk
 * @tsplus pipeable effect/core/stream/Stream rechunk
 * @category mutations
 * @since 1.0.0
 */
export function rechunk(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> process<R, E, A>(new Rechunker(n), n))
  }
}

function process<R, E, A>(
  rechunker: Rechunker<A>,
  target: number
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => {
      if (chunk.length === target && rechunker.isEmpty()) {
        return Channel.write(chunk).flatMap(() => process<R, E, A>(rechunker, target))
      }
      if (chunk.length > 0) {
        let chunks = List.empty<Chunk.Chunk<A>>()
        let result: Chunk.Chunk<A> | undefined = undefined
        let i = 0

        while (i < chunk.length) {
          while (i < chunk.length && result == null) {
            result = rechunker.write(pipe(chunk, Chunk.unsafeGet(i)))
            i = i + 1
          }

          if (result != null) {
            chunks = pipe(chunks, List.prepend(result))
            result = undefined
          }
        }

        return (
          Channel.writeAll(...List.reverse(chunks)).flatMap(() =>
            process<R, E, A>(rechunker, target)
          )
        )
      }
      return process(rechunker, target)
    },
    (cause) => rechunker.emitIfNotEmpty().flatMap(() => Channel.failCause(cause)),
    () => rechunker.emitIfNotEmpty()
  )
}

class Rechunker<A> {
  private builder: Array<A> = []
  private pos = 0

  constructor(readonly n: number) {}

  isEmpty(): boolean {
    return this.pos === 0
  }

  write(elem: A): Chunk.Chunk<A> | undefined {
    this.builder.push(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = Chunk.unsafeFromArray(this.builder)

      this.builder = []
      this.pos = 0

      return result
    }

    return undefined
  }

  emitIfNotEmpty(): Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<A>, void> {
    if (this.pos !== 0) {
      return Channel.write(Chunk.unsafeFromArray(this.builder))
    } else {
      return Channel.unit
    }
  }
}
