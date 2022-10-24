import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Either } from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a sink from a chunk processing function.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromPush
 * @category conversions
 * @since 1.0.0
 */
export function fromPush<R, E, In, L, Z>(
  push: Effect<
    R | Scope,
    never,
    (input: Option.Option<Chunk<In>>) => Effect<R, readonly [Either<E, Z>, Chunk<L>], void>
  >
): Sink<R, E, In, L, Z> {
  return new SinkInternal(Channel.unwrapScoped(push.map(pull)))
}

function pull<R, E, In, L, Z>(
  push: (option: Option.Option<Chunk<In>>) => Effect<R, readonly [Either<E, Z>, Chunk<L>], void>
): Channel<R, never, Chunk<In>, unknown, E, Chunk<L>, Z> {
  return Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(push(Option.some(input))).foldChannel(
        ([either, leftovers]) => {
          switch (either._tag) {
            case "Left": {
              return Channel.write(leftovers).flatMap(() => Channel.fail(either.left))
            }
            case "Right": {
              return Channel.write(leftovers).flatMap(() => Channel.succeed(either.right))
            }
          }
        },
        () => pull(push)
      ),
    (err) => Channel.fail(err),
    () =>
      Channel.fromEffect(push(Option.none)).foldChannel(
        ([either, leftovers]) => {
          switch (either._tag) {
            case "Left": {
              return Channel.write(leftovers).flatMap(() => Channel.fail(either.left))
            }
            case "Right": {
              return Channel.write(leftovers).flatMap(() => Channel.succeed(either.right))
            }
          }
        },
        () => Channel.fromEffect(Effect.dieMessage("empty sink"))
      )
  )
}
