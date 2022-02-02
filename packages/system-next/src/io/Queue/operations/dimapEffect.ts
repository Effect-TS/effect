import type { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue, XQueueInternal } from "../definition"

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 *
 * @tsplus fluent ets/Queue dimapEffect
 * @tsplus fluent ets/XQueue dimapEffect
 * @tsplus fluent ets/Dequeue dimapEffect
 * @tsplus fluent ets/XDequeue dimapEffect
 * @tsplus fluent ets/Enqueue dimapEffect
 * @tsplus fluent ets/XEnqueue dimapEffect
 */
export function dimapEffect_<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RC, EC, A>,
  g: (b: B) => Effect<RD, ED, D>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  concreteQueue(self)
  return new DimapEffect(self, f, g)
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 *
 * @ets_data_first dimapEffect_
 */
export function dimapEffect<A, B, C, RC, EC, RD, ED, D>(
  f: (c: C) => Effect<RC, EC, A>,
  g: (b: B) => Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> => dimapEffect_(self, f, g)
}

class DimapEffect<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D> extends XQueueInternal<
  RC & RA,
  RD & RB,
  EC | EA,
  ED | EB,
  C,
  D
> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => Effect<RC, EC, A>,
    readonly g: (b: B) => Effect<RD, ED, D>
  ) {
    super()
  }

  _awaitShutdown: UIO<void> = this.self._awaitShutdown

  _capacity: number = this.self._capacity

  _isShutdown: UIO<boolean> = this.self._isShutdown

  _offer(a: C, __etsTrace?: string): Effect<RC & RA, EA | EC, boolean> {
    return this.f(a).flatMap((a) => this.self._offer(a))
  }

  _offerAll(as: Iterable<C>, __etsTrace?: string): Effect<RC & RA, EC | EA, boolean> {
    return Effect.forEach(as, this.f).flatMap((as) => this.self._offerAll(as))
  }

  _shutdown: UIO<void> = this.self._shutdown

  _size: UIO<number> = this.self._size

  _take: Effect<RD & RB, ED | EB, D> = this.self._take.flatMap(this.g)

  _takeAll: Effect<RD & RB, ED | EB, Chunk<D>> = this.self._takeAll.flatMap((a) =>
    a.mapEffect(this.g)
  )

  _takeUpTo(n: number, __etsTrace?: string): Effect<RD & RB, ED | EB, Chunk<D>> {
    return this.self._takeUpTo(n).flatMap((bs) => bs.mapEffect(this.g))
  }
}
