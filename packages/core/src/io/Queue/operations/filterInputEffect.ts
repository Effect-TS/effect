import type { Chunk } from "../../../collection/immutable/Chunk"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue, XQueueInternal } from "../definition"

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 *
 * @tsplus fluent ets/Queue filterInputEffect
 * @tsplus fluent ets/XQueue filterInputEffect
 * @tsplus fluent ets/Dequeue filterInputEffect
 * @tsplus fluent ets/XDequeue filterInputEffect
 * @tsplus fluent ets/Enqueue filterInputEffect
 * @tsplus fluent ets/XEnqueue filterInputEffect
 */
export function filterInputEffect_<RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => Effect<R2, E2, boolean>
): XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
  concreteQueue(self)
  return new FilterInputEffect(self, f)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 *
 * @ets_data_first filterInputEffect_
 */
export function filterInputEffect<A, A1 extends A, R2, E2>(
  f: (_: A1) => Effect<R2, E2, boolean>
) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & R2, RB, EA | E2, EB, A1, B> => self.filterInputEffect(f)
}

class FilterInputEffect<
  RA,
  RB,
  EA,
  EB,
  B,
  A,
  A1 extends A,
  R2,
  E2
> extends XQueueInternal<RA & R2, RB, EA | E2, EB, A1, B> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (_: A1) => Effect<R2, E2, boolean>
  ) {
    super()
  }

  _awaitShutdown: UIO<void> = this.self._awaitShutdown

  _capacity: number = this.self._capacity

  _isShutdown: UIO<boolean> = this.self._isShutdown

  _offer(a: A1, __tsplusTrace?: string): Effect<RA & R2, EA | E2, boolean> {
    return this.f(a).flatMap((b) =>
      b ? this.self._offer(a) : Effect.succeedNow(false)
    )
  }

  _offerAll(as: Iterable<A1>, __tsplusTrace?: string): Effect<RA & R2, EA | E2, boolean> {
    return pipe(
      Effect.forEach(as, (a) =>
        this.f(a).map((b) => (b ? Option.some(a) : Option.none))
      ).flatMap((maybeAs) => {
        const filtered = maybeAs.collect(identity)

        return filtered.isEmpty()
          ? Effect.succeedNow(false)
          : this.self._offerAll(filtered)
      })
    )
  }

  _shutdown: UIO<void> = this.self._shutdown

  _size: UIO<number> = this.self._size

  _take: Effect<RB, EB, B> = this.self._take

  _takeAll: Effect<RB, EB, Chunk<B>> = this.self._takeAll

  _takeUpTo(n: number, __tsplusTrace?: string): Effect<RB, EB, Chunk<B>> {
    return this.self._takeUpTo(n)
  }
}
