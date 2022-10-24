import { identity } from "@fp-ts/data/Function"

/**
 * Creates a stream from an effect producing a value of type `Iterable<A>`
 *
 * @tsplus static effect/core/stream/Stream.Ops fromIterableEffect
 */
export function fromCollectionEffect<R, E, A>(
  collection: Effect<R, E, Iterable<A>>
): Stream<R, E, A> {
  return Stream.fromEffect(collection).mapConcat(identity)
}
