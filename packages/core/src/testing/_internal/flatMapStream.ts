import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export function flatMapStream<R, A, R2, A2>(
  stream: Stream<R, never, Option.Option<A>>,
  f: (a: A) => Stream<R2, never, Option.Option<A2>>
): Stream<R | R2, never, Option.Option<A2>> {
  const rechunked = stream.rechunk(1)
  concreteStream(rechunked)
  const channel = rechunked.channel.concatMapWithCustom(
    (chunk) =>
      pipe(
        chunk,
        Chunk.map((option) => {
          switch (option._tag) {
            case "Some": {
              const stream = f(option.value).rechunk(1).map((option) => {
                switch (option._tag) {
                  case "None": {
                    return Either.left(true)
                  }
                  case "Some": {
                    return Either.right(option.value)
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
        }),
        Chunk.reduce(
          Channel.unit as Channel<
            R2,
            unknown,
            unknown,
            unknown,
            never,
            Chunk.Chunk<Either.Either<boolean, A2>>,
            unknown
          >,
          (a, b) => a.zipRight(b)
        )
      ),
    constVoid,
    constVoid,
    (request) => {
      switch (request._tag) {
        case "Pulled": {
          const option = pipe(request.value, Chunk.head, Option.flatten)
          switch (option._tag) {
            case "Some": {
              return UpstreamPullStrategy.PullAfterNext(Option.none)
            }
            case "None": {
              return UpstreamPullStrategy.PullAfterAllEnqueued(Option.none)
            }
          }
        }
        case "NoUpstream": {
          return UpstreamPullStrategy.PullAfterAllEnqueued<Chunk.Chunk<Either.Either<boolean, A2>>>(
            request.activeDownstreamCount > 0 ?
              Option.some(Chunk.single(Either.left(false))) :
              Option.none
          )
        }
      }
    },
    (chunk) => {
      const option = Chunk.head(chunk)
      return Option.isSome(option) && Either.isLeft(option.value) && option.value.left ?
        ChildExecutorDecision.Yield :
        ChildExecutorDecision.Continue
    }
  )
  return Stream.fromChannel(channel)
    .filter((either) => !(Either.isLeft(either) && either.left))
    .map((either) => {
      switch (either._tag) {
        case "Left": {
          return Option.none
        }
        case "Right": {
          return Option.some(either.right)
        }
      }
    })
}
