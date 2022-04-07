import type { AtomicGauge } from "@effect/core/io/Metrics/atomic/AtomicGauge";
import type { Gauge } from "@effect/core/io/Metrics/Gauge/definition";
import { GaugeSym } from "@effect/core/io/Metrics/Gauge/definition";
import { _A } from "@effect/core/io/Metrics/Metric/definition";

export class InternalGauge<A> implements Gauge<A>, Equals {
  readonly [GaugeSym]: GaugeSym = GaugeSym;
  readonly [_A]!: (_: A) => void;

  gauge: AtomicGauge | undefined;
  gaugeRef: FiberRef<AtomicGauge> | undefined;

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Gauge<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Gauge(this.name, this.tags);
    this.gauge = MetricClient.client.value.getGauge(key);
    this.gaugeRef = undefined;
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this);
  }

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this.name), Hash.unknown(this.tags));
  }

  [Equals.sym](that: unknown): boolean {
    return isGauge(that) && this[Hash.sym]() === that[Hash.sym]();
  }
}

/**
 * @tsplus static ets/Gauge/Ops isGauge
 */
export function isGauge(u: unknown): u is Gauge<any> {
  return typeof u === "object" && u != null && GaugeSym in u;
}

/**
 * @tsplus macro remove
 */
export function concreteGauge<A>(_: Gauge<A>): asserts _ is InternalGauge<A> {
  //
}

export function withGauge<A, B>(
  self: Gauge<A>,
  f: (gauge: AtomicGauge) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteGauge(self);
  return self.gauge != null ? f(self.gauge) : self.gaugeRef!.getWith(f);
}
