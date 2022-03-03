import type { Chunk } from "../../../../../collection/immutable/Chunk"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicCounter } from "../../../atomic/AtomicCounter"
import { _A } from "../../../Metric"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { Counter } from "../../definition"
import { CounterSym } from "../../definition"

export class InternalCounter<A> implements Counter<A>, St.HasHash, St.HasEquals {
  readonly [_A]: (_: A) => void;
  readonly [CounterSym]: CounterSym = CounterSym

  counter: AtomicCounter | undefined
  counterRef: FiberRef<AtomicCounter> | undefined

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Counter<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Counter(this.name, this.tags)
    this.counter = MetricClient.client.value.getCounter(key)
    this.counterRef = undefined
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this)
  }

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this.name), St.hash(this.tags))
  }

  [St.equalsSym](that: unknown): boolean {
    return isCounter(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/CounterOps isCounter
 */
export function isCounter(u: unknown): u is Counter<any> {
  return typeof u === "object" && u != null && CounterSym in u
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
  concreteCounter(self)
  return self.counter != null ? f(self.counter) : self.counterRef!.getWith(f)
}
