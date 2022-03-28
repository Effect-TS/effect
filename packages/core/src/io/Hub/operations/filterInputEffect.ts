import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Managed } from "../../Managed"
import type { XDequeue } from "../../Queue"
import type { XHub } from "../definition"
import { concreteHub, XHubInternal } from "../definition"

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 *
 * @tsplus fluent ets/XHub filterInputEffect
 */
export function filterInputEffect_<RA, RA1, RB, EA, EA1, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: A) => Effect<RA1, EA1, boolean>
): XHub<RA & RA1, RB, EA | EA1, EB, A, B> {
  concreteHub(self)
  return new FilterInputEffectImplementation(self, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 */
export const filterInputEffect = Pipeable(filterInputEffect_)

class FilterInputEffectImplementation<
  RA,
  RA1,
  RB,
  EA,
  EA1,
  EB,
  A,
  B
> extends XHubInternal<RA & RA1, RB, EA | EA1, EB, A, B> {
  _awaitShutdown: UIO<void>
  _capacity: number
  _isShutdown: UIO<boolean>
  _shutdown: UIO<void>
  _size: UIO<number>
  _subscribe: Managed<unknown, never, XDequeue<RB, EB, B>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (a: A) => Effect<RA1, EA1, boolean>
  ) {
    super()
    this._awaitShutdown = source._awaitShutdown
    this._capacity = source._capacity
    this._isShutdown = source._isShutdown
    this._shutdown = source._shutdown
    this._size = source._size
    this._subscribe = source._subscribe
  }

  _publish(a: A, __tsplusTrace?: string): Effect<RA1 & RA, EA | EA1, boolean> {
    return this.f(a).flatMap((b) =>
      b ? this.source._publish(a) : Effect.succeed(false)
    )
  }

  _publishAll(
    as: Iterable<A>,
    __tsplusTrace?: string
  ): Effect<RA1 & RA, EA | EA1, boolean> {
    return Effect.filter(as, (a) => this.f(a)).flatMap((as) =>
      as.isNonEmpty() ? this.source._publishAll(as) : Effect.succeed(false)
    )
  }
}
