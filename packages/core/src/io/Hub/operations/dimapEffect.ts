import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Managed } from "../../Managed"
import type { XDequeue } from "../../Queue"
import type { XHub } from "../definition"
import { concreteHub, XHubInternal } from "../definition"

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 *
 * @tsplus fluent ets/XHub dimapEffect
 */
export function dimapEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RC, EC, A>,
  g: (b: B) => Effect<RD, ED, D>
): XHub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  concreteHub(self)
  return new DimapEffectImplementation(self, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 */
export const dimapEffect = Pipeable(dimapEffect_)

class DimapEffectImplementation<
  RA,
  RB,
  RC,
  RD,
  EA,
  EB,
  EC,
  ED,
  A,
  B,
  C,
  D
> extends XHubInternal<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  _awaitShutdown: UIO<void>
  _capacity: number
  _isShutdown: UIO<boolean>
  _shutdown: UIO<void>
  _size: UIO<number>
  _subscribe: Managed<unknown, never, XDequeue<RD & RB, ED | EB, D>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => Effect<RC, EC, A>,
    g: (b: B) => Effect<RD, ED, D>
  ) {
    super()
    this._awaitShutdown = source._awaitShutdown
    this._capacity = source._capacity
    this._isShutdown = source._isShutdown
    this._shutdown = source._shutdown
    this._size = source._size
    this._subscribe = source._subscribe.map((queue) => queue.mapEffect(g))
  }

  _publish(c: C, __tsplusTrace?: string): Effect<RC & RA, EA | EC, boolean> {
    return this.f(c).flatMap((a) => this.source._publish(a))
  }

  _publishAll(
    cs: Iterable<C>,
    __tsplusTrace?: string
  ): Effect<RC & RA, EA | EC, boolean> {
    return Effect.forEach(cs, (c) => this.f(c)).flatMap((as) =>
      this.source._publishAll(as)
    )
  }
}
