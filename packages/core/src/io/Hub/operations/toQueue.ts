import { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { XEnqueue } from "../../Queue/definition/base"
import { XQueueInternal } from "../../Queue/definition/base"
import type { XHub, XHubInternal } from "../definition"
import { concreteHub } from "../definition"

/**
 * Views the hub as a queue that can only be written to.
 *
 * @tsplus fluent ets/XHub toQueue
 */
export function toQueue<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): XEnqueue<RA, EA, A> {
  concreteHub(self)
  return new ToQueueImplementation(self)
}

class ToQueueImplementation<RA, RB, EA, EB, A, B> extends XQueueInternal<
  RA,
  never,
  EA,
  unknown,
  A,
  never
> {
  _awaitShutdown: UIO<void>
  _capacity: number
  _isShutdown: UIO<boolean>
  _shutdown: UIO<void>
  _size: UIO<number>
  _take: Effect<unknown, never, never>
  _takeAll: Effect<unknown, never, Chunk<never>>

  constructor(readonly source: XHubInternal<RA, RB, EA, EB, A, B>) {
    super()
    this._awaitShutdown = source._awaitShutdown
    this._capacity = source._capacity
    this._isShutdown = source._isShutdown
    this._shutdown = source._shutdown
    this._size = source._size
    this._take = Effect.never
    this._takeAll = Effect.succeed(Chunk.empty())
  }

  _offer(a: A): Effect<RA, EA, boolean> {
    return this.source._publish(a)
  }

  _offerAll(as: Iterable<A>): Effect<RA, EA, boolean> {
    return this.source._publishAll(as)
  }

  _takeUpTo(): Effect<unknown, never, Chunk<never>> {
    return Effect.succeed(Chunk.empty())
  }
}
