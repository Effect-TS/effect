import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each. The
 * last chunk might contain less than `n` elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects rechunk
 * @tsplus pipeable effect/core/stream/Stream rechunk
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
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      if (chunk.size === target && rechunker.isEmpty()) {
        return Channel.write(chunk) > process<R, E, A>(rechunker, target)
      }
      if (chunk.size > 0) {
        let chunks = List.empty<Chunk<A>>()
        let result: Chunk<A> | undefined = undefined
        let i = 0

        while (i < chunk.size) {
          while (i < chunk.size && result == null) {
            result = rechunker.write(chunk.unsafeGet(i))
            i = i + 1
          }

          if (result != null) {
            chunks = chunks.prepend(result)
            result = undefined
          }
        }

        return (
          Channel.writeAll(...chunks.reverse) > process<R, E, A>(rechunker, target)
        )
      }
      return process(rechunker, target)
    },
    (cause) => rechunker.emitIfNotEmpty() > Channel.failCauseSync(cause),
    () => rechunker.emitIfNotEmpty()
  )
}

class Rechunker<A> {
  private builder = Chunk.builder<A>()
  private pos = 0

  constructor(readonly n: number) {}

  isEmpty(): boolean {
    return this.pos === 0
  }

  write(elem: A): Chunk<A> | undefined {
    this.builder.append(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = this.builder.build()

      this.builder = Chunk.builder()
      this.pos = 0

      return result
    }

    return undefined
  }

  emitIfNotEmpty(): Channel<never, unknown, unknown, unknown, never, Chunk<A>, void> {
    if (this.pos !== 0) {
      return Channel.write(this.builder.build())
    } else {
      return Channel.unit
    }
  }
}
