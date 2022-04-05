import type { AtomicSetCount } from "@effect-ts/core/io/Metrics/atomic/AtomicSetCount";
import { _A } from "@effect-ts/core/io/Metrics/Metric/definition";
import type { SetCount } from "@effect-ts/core/io/Metrics/SetCount/definition";
import { SetCountSym } from "@effect-ts/core/io/Metrics/SetCount/definition";

export class InternalSetCount<A> implements SetCount<A>, Equals {
  readonly [SetCountSym]: SetCountSym = SetCountSym;
  readonly [_A]!: (_: A) => void;

  setCount: AtomicSetCount | undefined;
  setCountRef: FiberRef<AtomicSetCount> | undefined;

  constructor(
    readonly name: string,
    readonly setTag: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: SetCount<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.SetCount(this.name, this.setTag, this.tags);
    this.setCount = MetricClient.client.value.getSetCount(key);
    this.setCountRef = undefined;
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this);
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this.name),
      Hash.combine(Hash.string(this.setTag), Hash.unknown(this.tags))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return isSetCount(that) && this[Hash.sym]() === that[Hash.sym]();
  }
}

/**
 * @tsplus static ets/SetCount/Ops isSetCount
 */
export function isSetCount(u: unknown): u is SetCount<any> {
  return typeof u === "object" && u != null && SetCountSym in u;
}

/**
 * @tsplus macro remove
 */
export function concreteSetCount<A>(_: SetCount<A>): asserts _ is InternalSetCount<A> {
  //
}

export function withSetCount<A, B>(
  self: SetCount<A>,
  f: (setCount: AtomicSetCount) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteSetCount(self);
  return self.setCount != null ? f(self.setCount) : self.setCountRef!.getWith(f);
}
