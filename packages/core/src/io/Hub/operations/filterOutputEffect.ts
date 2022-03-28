import type { Effect, UIO } from "../../Effect"
import type { Managed } from "../../Managed"
import type { XDequeue } from "../../Queue"
import type { XHub } from "../definition"
import { concreteHub, XHubInternal } from "../definition"

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 *
 * @tsplus fluent ets/XHub filterOutputEffect
 */
export function filterOutputEffect_<RA, RB, RB1, EA, EB, EB1, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: B) => Effect<RB1, EB1, boolean>
): XHub<RA, RB & RB1, EA, EB | EB1, A, B> {
  concreteHub(self)
  return new FilterOutputMImplementation(self, f)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 */
export const filterOutputEffect = Pipeable(filterOutputEffect_)

class FilterOutputMImplementation<RA, RB, RB1, EA, EB, EB1, A, B> extends XHubInternal<
  RA,
  RB & RB1,
  EA,
  EB | EB1,
  A,
  B
> {
  _awaitShutdown: UIO<void>
  _capacity: number
  _isShutdown: UIO<boolean>
  _shutdown: UIO<void>
  _size: UIO<number>
  _subscribe: Managed<unknown, never, XDequeue<RB & RB1, EB | EB1, B>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (b: B) => Effect<RB1, EB1, boolean>
  ) {
    super()
    this._awaitShutdown = source._awaitShutdown
    this._capacity = source._capacity
    this._isShutdown = source._isShutdown
    this._shutdown = source._shutdown
    this._size = source._size
    this._subscribe = source._subscribe.map((queue) => queue.filterOutputEffect(f))
  }

  _publish(a: A, __tsplusTrace?: string): Effect<RA, EA, boolean> {
    return this.source._publish(a)
  }

  _publishAll(as: Iterable<A>, __tsplusTrace?: string): Effect<RA, EA, boolean> {
    return this.source._publishAll(as)
  }
}
