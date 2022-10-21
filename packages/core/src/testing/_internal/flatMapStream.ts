import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { constVoid } from "@tsplus/stdlib/data/Function"

export function flatMapStream<R, E, A, R2, A2>(
  stream: Stream<R, never, Maybe<A>>,
  f: (a: A) => Stream<R2, never, Maybe<A2>>
): Stream<R | R2, never, Maybe<A2>> {
  const rechunked = stream.rechunk(1)
  concreteStream(rechunked)
  const channel = rechunked.channel.concatMapWithCustom(
    (as) =>
      as.map((maybe) => {
        switch (maybe._tag) {
          case "Some": {
            const stream = f(maybe.value).rechunk(1).map((maybe) => {
              switch (maybe._tag) {
                case "None": {
                  return Either.left(true)
                }
                case "Some": {
                  return Either.right(maybe.value)
                }
              }
            })
            concreteStream(stream)
            return stream.channel
          }
          case "None": {
            const stream = Stream(Either.left(false))
            concreteStream(stream)
            return stream.channel
          }
        }
      }).reduce(
        Channel.unit as Channel<
          R2,
          unknown,
          unknown,
          unknown,
          never,
          Chunk<Either<boolean, A2>>,
          unknown
        >,
        (a, b) => a.zipRight(b)
      ),
    constVoid,
    constVoid,
    (request) => {
      switch (request._tag) {
        case "Pulled": {
          const maybe = request.value.head.flatten
          switch (maybe._tag) {
            case "Some": {
              return UpstreamPullStrategy.PullAfterNext(Maybe.none)
            }
            case "None": {
              return UpstreamPullStrategy.PullAfterAllEnqueued(Maybe.none)
            }
          }
        }
        case "NoUpstream": {
          return UpstreamPullStrategy.PullAfterAllEnqueued<Chunk<Either<boolean, A2>>>(
            request.activeDownstreamCount > 0 ?
              Maybe.some(Chunk.single(Either.left(false))) :
              Maybe.none
          )
        }
      }
    },
    (chunk) => {
      const maybe = chunk.head
      return maybe.isSome() && maybe.value.isLeft() && maybe.value.left ?
        ChildExecutorDecision.Yield :
        ChildExecutorDecision.Continue
    }
  )
  return Stream.fromChannel(channel)
    .filter((either) => !(either.isLeft() && either.left))
    .map((either) => {
      switch (either._tag) {
        case "Left": {
          return Maybe.none
        }
        case "Right": {
          return Maybe.some(either.right)
        }
      }
    })
}
