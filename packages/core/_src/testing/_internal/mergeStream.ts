import { flatMapStream } from "@effect/core/testing/_internal/flatMapStream"

/**
 * An implementation of `Stream.merge` that supports breadth first search.
 */
export function mergeStream<R, A, R2>(
  left: Stream<R, never, Maybe<A>>,
  right: Stream<R2, never, Maybe<A>>
): Stream<R | R2, never, Maybe<A>> {
  return flatMapStream(
    Stream(
      Maybe.some<Stream<R | R2, never, Maybe<A>>>(left),
      Maybe.some<Stream<R | R2, never, Maybe<A>>>(right)
    ),
    identity
  )
}
