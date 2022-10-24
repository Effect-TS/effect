import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Splits the sink on the specified predicate, returning a new sink that
 * consumes elements until an element after the first satisfies the specified
 * predicate.
 *
 * @tsplus static effect/core/stream/Sink.Aspects splitWhere
 * @tsplus pipeable effect/core/stream/Sink splitWhere
 * @category mutations
 * @since 1.0.0
 */
export function splitWhere<In1>(f: Predicate<In1>) {
  return <R, E, In, L extends In1, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In & In1, In1, Z> => {
    concreteSink(self)
    return new SinkInternal(
      Channel.fromEffect(Ref.make(Chunk.empty as Chunk.Chunk<In & In1>)).flatMap((ref) =>
        splitter<E, In & In1>(false, ref, f)
          .pipeToOrFail(self.channel)
          .doneCollect
          .flatMap(([leftovers, z]) =>
            Channel.fromEffect(ref.get).flatMap(
              (leftover) =>
                Channel
                  .write(pipe(leftover, Chunk.concat(Chunk.flatten(leftovers))))
                  .flatMap(() => Channel.succeed(z))
            )
          )
      )
    )
  }
}

function splitter<E, A>(
  written: boolean,
  leftovers: Ref<Chunk.Chunk<A>>,
  f: Predicate<A>
): Channel<never, never, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWithCause(
    (input: Chunk.Chunk<A>) => {
      if (Chunk.isEmpty(input)) {
        return splitter(written, leftovers, f)
      }
      if (written) {
        const index = pipe(input, Chunk.findFirstIndex(f), Option.getOrElse(-1))
        if (index === -1) {
          return Channel.write(input).flatMap(() => splitter<E, A>(true, leftovers, f))
        }
        const [left, right] = pipe(input, Chunk.splitAt(index))
        return Channel.write(left).flatMap(() => Channel.fromEffect(leftovers.set(right)))
      }
      const index = pipe(input, Chunk.drop(1), Chunk.findFirstIndex(f), Option.getOrElse(-1))
      if (index === -1) {
        return Channel.write(input).flatMap(() => splitter<E, A>(true, leftovers, f))
      }
      const [left, right] = pipe(input, Chunk.splitAt(Math.max(index, 1)))
      return Channel.write(left).flatMap(() => Channel.fromEffect(leftovers.set(right)))
    },
    (cause) => Channel.failCause(cause),
    (done) => Channel.succeed(done)
  )
}
