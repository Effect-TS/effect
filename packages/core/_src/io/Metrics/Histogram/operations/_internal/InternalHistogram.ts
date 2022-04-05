import type { AtomicHistogram } from "@effect-ts/core/io/Metrics/atomic/AtomicHistogram";
import type { Boundaries } from "@effect-ts/core/io/Metrics/Histogram/definition";
import { HistogramSym } from "@effect-ts/core/io/Metrics/Histogram/definition";
import { _A } from "@effect-ts/core/io/Metrics/Metric/definition";

export class InternalHistogram<A> implements Histogram<A>, Equals {
  readonly [HistogramSym]: HistogramSym = HistogramSym;
  readonly [_A]!: (_: A) => void;

  histogram: AtomicHistogram | undefined;
  histogramRef: FiberRef<AtomicHistogram> | undefined;

  constructor(
    readonly name: string,
    readonly boundaries: Boundaries,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Histogram<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Histogram(this.name, this.boundaries, this.tags);
    this.histogram = MetricClient.client.value.getHistogram(key);
    this.histogramRef = undefined;
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this);
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this.name),
      Hash.combine(Hash.unknown(this.boundaries), Hash.unknown(this.tags))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return isHistogram(that) && this[Hash.sym]() === that[Hash.sym]();
  }
}

/**
 * @tsplus static ets/Histogram/Ops isHistogram
 */
export function isHistogram(u: unknown): u is Histogram<any> {
  return typeof u === "object" && u != null && HistogramSym in u;
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
  concreteHistogram(self);
  return self.histogram != null ? f(self.histogram) : self.histogramRef!.getWith(f);
}
