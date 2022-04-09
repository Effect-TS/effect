import type { AtomicCounter } from "@effect/core/io/Metrics/atomic/AtomicCounter";
import type { Counter } from "@effect/core/io/Metrics/Counter/definition";
import { CounterSym } from "@effect/core/io/Metrics/Counter/definition";
import { _A } from "@effect/core/io/Metrics/Metric/definition";

export class InternalCounter<A> implements Counter<A>, Equals {
  readonly [CounterSym]: CounterSym = CounterSym;
  readonly [_A]!: (_: A) => void;

  counter: AtomicCounter | undefined;
  counterRef: FiberRef<AtomicCounter> | undefined;

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Counter<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Counter(this.name, this.tags);
    this.counter = MetricClient.client.value.getCounter(key);
    this.counterRef = undefined;
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
    return isCounter(that) && this[Hash.sym]() === that[Hash.sym]();
  }
}

/**
 * @tsplus static ets/Counter/Ops isCounter
 */
export function isCounter(u: unknown): u is Counter<any> {
  return typeof u === "object" && u != null && CounterSym in u;
}

/**
 * @tsplus macro remove
 */
export function concreteCounter<A>(_: Counter<A>): asserts _ is InternalCounter<A> {
  //
}

export function withCounter<A, B>(
  self: Counter<A>,
  f: (counter: AtomicCounter) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteCounter(self);
  return self.counter != null ? f(self.counter) : self.counterRef!.getWith(f);
}
