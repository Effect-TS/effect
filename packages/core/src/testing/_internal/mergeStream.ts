import { flatMapStream } from "@effect/core/testing/_internal/flatMapStream"
import { identity } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * An implementation of `Stream.merge` that supports breadth first search.
 *
 * @internal
 */
export function mergeStream<R, A, R2>(
  left: Stream<R, never, Option.Option<A>>,
  right: Stream<R2, never, Option.Option<A>>
): Stream<R | R2, never, Option.Option<A>> {
  return flatMapStream(
    Stream(
      Option.some<Stream<R | R2, never, Option.Option<A>>>(left),
      Option.some<Stream<R | R2, never, Option.Option<A>>>(right)
    ),
    identity
  )
}
