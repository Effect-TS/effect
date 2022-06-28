import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects find
 * @tsplus pipeable effect/core/stream/Stream find
 */
export function find<A, B extends A>(
  f: Refinement<A, B>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
export function find<A>(
  f: Predicate<A>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
export function find<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, any> = Channel.readWith(
      (chunk) => chunk.find(f).fold(loop, (a) => Channel.write(Chunk.single(a))),
      (e) => Channel.fail(e),
      (_) => Channel.unit
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
