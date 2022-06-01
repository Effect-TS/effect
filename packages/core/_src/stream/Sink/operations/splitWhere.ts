import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Splits the sink on the specified predicate, returning a new sink that
 * consumes elements until an element after the first satisfies the specified
 * predicate.
 *
 * @tsplus fluent ets/Sink splitWhere
 */
export function splitWhere_<R, E, In, In1, L extends In1, Z>(
  self: Sink<R, E, In, L, Z>,
  f: Predicate<In1>,
  __tsplusTrace?: string
): Sink<R, E, In & In1, In1, Z> {
  concreteSink(self)
  return new SinkInternal(
    Channel.fromEffect(Ref.make(Chunk.empty<In & In1>())).flatMap((ref) =>
      splitter<E, In & In1>(false, ref, f)
        .pipeToOrFail(self.channel)
        .doneCollect()
        .flatMap(({ tuple: [leftovers, z] }) =>
          Channel.fromEffect(ref.get()).flatMap(
            (leftover) => Channel.write(leftover + leftovers.flatten()) > Channel.succeed(z)
          )
        )
    )
  )
}

/**
 * Splits the sink on the specified predicate, returning a new sink that
 * consumes elements until an element after the first satisfies the specified
 * predicate.
 *
 * @tsplus static ets/Sink/Aspects splitWhere
 */
export const splitWhere = Pipeable(splitWhere_)

function splitter<E, A>(
  written: boolean,
  leftovers: Ref<Chunk<A>>,
  f: Predicate<A>
): Channel<never, never, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWithCause(
    (input: Chunk<A>) => {
      if (input.isEmpty()) {
        return splitter(written, leftovers, f)
      }
      if (written) {
        const index = input.indexWhere(f)
        if (index === -1) {
          return Channel.write(input) > splitter<E, A>(true, leftovers, f)
        }
        const {
          tuple: [left, right]
        } = input.splitAt(index)
        return Channel.write(left) > Channel.fromEffect(leftovers.set(right))
      }
      const index = input.indexWhereFrom(1, f)
      if (index === -1) {
        return Channel.write(input) > splitter<E, A>(true, leftovers, f)
      }
      const {
        tuple: [left, right]
      } = input.splitAt(Math.max(index, 1))
      return Channel.write(left) > Channel.fromEffect(leftovers.set(right))
    },
    (cause) => Channel.failCause(cause),
    (done) => Channel.succeed(done)
  )
}
