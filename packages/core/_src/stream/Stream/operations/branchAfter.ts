import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

interface Pipeline<R, E, A, R2, E2, B> {
  (stream: Stream<R, E, A>): Stream<R2, E2, B>
}

/**
 * Reads the first `n` values from the stream and uses them to choose the
 * pipeline that will be used for the remainder of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects branchAfter
 * @tsplus pipeable effect/core/stream/Stream branchAfter
 */
export function branchAfter<R, E, A, R2, E2, B>(
  n: number,
  f: (output: Chunk<A>) => Pipeline<R, E, A, R2, E2, B>
) {
  return (self: Stream<R, E, A>): Stream<R | R2, E | E2, B> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.suspend(self.channel >> collecting(Chunk.empty<A>(), n, f))
    )
  }
}

function collecting<R, E, A, R2, E2, B>(
  buffer: Chunk<A>,
  n: number,
  f: (output: Chunk<A>) => Pipeline<R, E, A, R2, E2, B>
): Channel<R | R2, E, Chunk<A>, unknown, E | E2, Chunk<B>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      const newBuffer = buffer + chunk
      if (newBuffer.length >= n) {
        const {
          tuple: [inputs, inputs1]
        } = newBuffer.splitAt(n)
        const pipeline = f(inputs)
        const stream = pipeline(Stream.fromChunk(inputs1))
        concreteStream(stream)
        return stream.channel > emitting(pipeline)
      }
      return collecting(newBuffer, n, f)
    },
    (cause) => Channel.failCauseSync(cause),
    () => {
      if (buffer.isEmpty) {
        return Channel.unit
      }
      const pipeline = f(buffer)
      const stream = pipeline(Stream.empty)
      concreteStream(stream)
      return stream.channel
    }
  )
}

function emitting<R, E, A, R2, E2, B>(
  pipeline: Pipeline<R, E, A, R2, E2, B>
): Channel<R | R2, E, Chunk<A>, unknown, E | E2, Chunk<B>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      const stream = pipeline(Stream.fromChunk(chunk))
      concreteStream(stream)
      return stream.channel > emitting(pipeline)
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
