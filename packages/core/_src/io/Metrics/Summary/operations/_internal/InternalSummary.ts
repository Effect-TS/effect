import type { AtomicSummary } from "@effect-ts/core/io/Metrics/atomic/AtomicSummary";
import { _A } from "@effect-ts/core/io/Metrics/Metric/definition";
import type { Summary } from "@effect-ts/core/io/Metrics/Summary/definition";
import { SummarySym } from "@effect-ts/core/io/Metrics/Summary/definition";

export class InternalSummary<A> implements Summary<A>, Equals {
  readonly [SummarySym]: SummarySym = SummarySym;
  readonly [_A]!: (_: A) => void;

  summary: AtomicSummary | undefined;
  summaryRef: FiberRef<AtomicSummary> | undefined;

  constructor(
    readonly name: string,
    readonly maxSize: number,
    readonly maxAge: Duration,
    readonly error: number,
    readonly quantiles: Chunk<number>,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Summary<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Summary(name, maxSize, maxAge, error, quantiles, tags);
    this.summary = MetricClient.client.value.getSummary(key);
    this.summaryRef = undefined;
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this);
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this.name),
      Hash.combine(
        Hash.number(this.maxSize),
        Hash.combine(
          Hash.unknown(this.maxAge),
          Hash.combine(
            Hash.number(this.error),
            Hash.combine(Hash.unknown(this.quantiles), Hash.unknown(this.tags))
          )
        )
      )
    );
  }

  [Equals.sym](that: unknown): boolean {
    return isSummary(that) && this[Hash.sym]() === that[Hash.sym]();
  }
}

/**
 * @tsplus static ets/Summary/Ops isSummary
 */
export function isSummary(u: unknown): u is Summary<any> {
  return typeof u === "object" && u != null && SummarySym in u;
}

/**
 * @tsplus macro remove
 */
export function concreteSummary<A>(_: Summary<A>): asserts _ is InternalSummary<A> {
  //
}

export function withSummary<A, B>(
  self: Summary<A>,
  f: (summary: AtomicSummary) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteSummary(self);
  return self.summary != null ? f(self.summary) : self.summaryRef!.getWith(f);
}
