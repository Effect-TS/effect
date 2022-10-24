import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

interface Pipeline<R, E, A, R2, E2, B> {
  (stream: Stream<R, E, A>): Stream<R2, E2, B>
}

/**
 * Reads the first `n` values from the stream and uses them to choose the
 * pipeline that will be used for the remainder of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects branchAfter
 * @tsplus pipeable effect/core/stream/Stream branchAfter
 * @category mutations
 * @since 1.0.0
 */
export function branchAfter<R, E, A, R2, E2, B>(
  n: number,
  f: (output: Chunk.Chunk<A>) => Pipeline<R, E, A, R2, E2, B>
) {
  return (self: Stream<R, E, A>): Stream<R | R2, E | E2, B> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.suspend(self.channel.pipeTo(collecting(Chunk.empty, n, f)))
    )
  }
}

function collecting<R, E, A, R2, E2, B>(
  buffer: Chunk.Chunk<A>,
  n: number,
  f: (output: Chunk.Chunk<A>) => Pipeline<R, E, A, R2, E2, B>
): Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<B>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => {
      const newBuffer = pipe(buffer, Chunk.concat(chunk))
      if (newBuffer.length >= n) {
        const [inputs, inputs1] = pipe(newBuffer, Chunk.splitAt(n))
        const pipeline = f(inputs)
        const stream = pipeline(Stream.fromChunk(inputs1))
        concreteStream(stream)
        return stream.channel.flatMap(() => emitting(pipeline))
      }
      return collecting(newBuffer, n, f)
    },
    (cause) => Channel.failCauseSync(cause),
    () => {
      if (Chunk.isEmpty(buffer)) {
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
): Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<B>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => {
      const stream = pipeline(Stream.fromChunk(chunk))
      concreteStream(stream)
      return stream.channel.flatMap(() => emitting(pipeline))
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
