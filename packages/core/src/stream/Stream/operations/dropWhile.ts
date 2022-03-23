import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Predicate } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a pipeline that drops elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus fluent ets/Stream dropWhile
 */
export function dropWhile_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel >> dropWhileInternal<R, E, A>(f))
}

/**
 * Creates a pipeline that drops elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus static ets/StreamOps dropWhile
 */
export const dropWhile = Pipeable(dropWhile_)

function dropWhileInternal<R, E, A>(
  f: Predicate<A>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const out = chunk.dropWhile(f)
      return out.isEmpty()
        ? dropWhileInternal<R, E, A>(f)
        : Channel.write(out) > Channel.identity<E, Chunk<A>, unknown>()
    },
    (err) => Channel.fail(err),
    (out) => Channel.succeedNow(out)
  )
}
