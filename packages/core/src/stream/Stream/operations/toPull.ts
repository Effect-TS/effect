import type { Chunk } from "../../../collection/immutable/Chunk"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { Stream } from "../../Stream"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * @tsplus fluent ets/Stream toPull
 */
export function toPull<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Effect<R, Option<E>, Chunk<A>>> {
  concreteStream(self)
  return self.channel.toPull().map((pull) =>
    pull.mapError(Option.some).flatMap((either) =>
      either.fold(
        () => Effect.fail(Option.none),
        (elem) => Effect.succeed(elem)
      )
    )
  )
}
