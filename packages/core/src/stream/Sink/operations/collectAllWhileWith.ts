import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Repeatedly runs the sink for as long as its results satisfy the predicate
 * `p`. The sink's results will be accumulated using the stepping function
 * `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects collectAllWhileWith
 * @tsplus pipeable effect/core/stream/Sink collectAllWhileWith
 * @category constructors
 * @since 1.0.0
 */
export function collectAllWhileWith<Z, S>(
  z: S,
  p: Predicate<Z>,
  f: (s: S, z: Z) => S
) {
  return <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>): Sink<R, E, In, L, S> => {
    concreteSink(self)
    return new SinkInternal(
      Channel.fromEffect(Ref.make(Chunk.empty as Chunk.Chunk<In>).zip(Ref.make(false))).flatMap(
        ([leftoversRef, upstreamDoneRef]) => {
          const upstreamMarker: Channel<
            R,
            never,
            Chunk.Chunk<In>,
            unknown,
            never,
            Chunk.Chunk<In>,
            unknown
          > = Channel.readWith(
            (chunk: Chunk.Chunk<In>) => Channel.write(chunk).flatMap(() => upstreamMarker),
            (err) => Channel.fail(err),
            (x) => Channel.fromEffect(upstreamDoneRef.set(true)).as(x)
          )
          return (
            upstreamMarker
              .pipeTo(Channel.bufferChunk<In, never, unknown>(leftoversRef))
              .pipeTo(loop(self, leftoversRef, upstreamDoneRef, z, p, f))
          )
        }
      )
    )
  }
}

function loop<R, E, In, L extends In, Z, S>(
  self: Sink<R, E, In, L, Z>,
  leftoversRef: Ref<Chunk.Chunk<In>>,
  upstreamDoneRef: Ref<boolean>,
  currentResult: S,
  p: Predicate<Z>,
  f: (s: S, z: Z) => S
): Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, S> {
  concreteSink(self)
  return self.channel.doneCollect.foldChannel(
    (err) => Channel.fail(err),
    ([leftovers, doneValue]) =>
      p(doneValue)
        ? Channel.fromEffect(leftoversRef.set(Chunk.flatten(leftovers))).flatMap(() =>
          Channel.fromEffect(upstreamDoneRef.get).flatMap((upstreamDone) => {
            const accumulatedResult = f(currentResult, doneValue)
            return upstreamDone
              ? Channel.write(Chunk.flatten(leftovers)).as(accumulatedResult)
              : loop(self, leftoversRef, upstreamDoneRef, accumulatedResult, p, f)
          })
        )
        : Channel.write(Chunk.flatten(leftovers)).as(currentResult)
  )
}
