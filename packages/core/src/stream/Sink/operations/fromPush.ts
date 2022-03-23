import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink from a chunk processing function.
 *
 * @tsplus static ets/SinkOps fromPush
 */
export function fromPush<R, E, In, L, Z>(
  push: Managed<
    R,
    never,
    (input: Option<Chunk<In>>) => Effect<R, Tuple<[Either<E, Z>, Chunk<L>]>, void>
  >,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(Channel.unwrapManaged(push.map(pull)))
}

function pull<R, E, In, L, Z>(
  push: (option: Option<Chunk<In>>) => Effect<R, Tuple<[Either<E, Z>, Chunk<L>]>, void>,
  __tsplusTrace?: string
): Channel<R, never, Chunk<In>, unknown, E, Chunk<L>, Z> {
  return Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(push(Option.some(input))).foldChannel(
        ({ tuple: [either, leftovers] }) =>
          either.fold(
            (e) => Channel.write(leftovers) > Channel.fail(e),
            (z) => Channel.write(leftovers) > Channel.succeedNow(z)
          ),
        () => pull(push)
      ),
    (err) => Channel.fail(err),
    () =>
      Channel.fromEffect(push(Option.none)).foldChannel(
        ({ tuple: [either, leftovers] }) =>
          either.fold(
            (e) => Channel.write(leftovers) > Channel.fail(e),
            (z) => Channel.write(leftovers) > Channel.succeedNow(z)
          ),
        () => Channel.fromEffect(Effect.dieMessage("empty sink"))
      )
  )
}
