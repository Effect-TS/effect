import type { Chunk } from "../../../../../collection/immutable/Chunk"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicHistogram } from "../../../atomic/AtomicHistogram"
import { _A } from "../../../Metric/definition"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { Boundaries, Histogram } from "../../definition"
import { HistogramSym } from "../../definition"

export class InternalHistogram<A> implements Histogram<A>, St.HasHash, St.HasEquals {
  readonly [_A]: (_: A) => void;
  readonly [HistogramSym]: HistogramSym = HistogramSym

  histogram: AtomicHistogram | undefined
  histogramRef: FiberRef<AtomicHistogram> | undefined

  constructor(
    readonly name: string,
    readonly boundaries: Boundaries,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Histogram<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Histogram(this.name, this.boundaries, this.tags)
    this.histogram = MetricClient.client.value.getHistogram(key)
    this.histogramRef = undefined
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this)
  }

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hash(this.boundaries), St.hash(this.tags))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isHistogram(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/isHistogram isHistogram
 */
export function isHistogram(u: unknown): u is Histogram<any> {
  return typeof u === "object" && u != null && HistogramSym in u
}

/**
 * @tsplus macro remove
 */
export function concreteHistogram<A>(
  _: Histogram<A>
): asserts _ is InternalHistogram<A> {
  //
}

export function withHistogram<A, B>(
  self: Histogram<A>,
  f: (histogram: AtomicHistogram) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteHistogram(self)
  return self.histogram != null ? f(self.histogram) : self.histogramRef!.getWith(f)
}
