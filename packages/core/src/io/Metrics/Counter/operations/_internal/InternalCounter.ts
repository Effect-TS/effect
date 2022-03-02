import type { Chunk } from "../../../../../collection/immutable/Chunk"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicCounter } from "../../../atomic/AtomicCounter"
import { BaseMetric } from "../../../Metric"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { Counter } from "../../definition"
import { CounterSym } from "../../definition"

export class InternalCounter<A>
  extends BaseMetric<A>
  implements Counter<A>, St.HasHash, St.HasEquals
{
  readonly [CounterSym]: CounterSym = CounterSym

  counter: AtomicCounter | undefined
  counterRef: FiberRef<AtomicCounter> | undefined

  constructor(
    readonly _name: string,
    readonly _tags: Chunk<MetricLabel>,
    readonly _aspect: (
      self: Counter<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    super()
    this.counter = MetricClient.client.value.getCounter(
      MetricKey.Counter(this._name, this._tags)
    )
    this.counterRef = undefined
  }

  _track<R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> {
    return this._aspect(this)(effect)
  }

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._name), St.hash(this._tags))
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

export function withCounter<A, B>(
  self: Counter<A>,
  f: (counter: AtomicCounter) => UIO<B>,
  __tsplusTrace?: string
): UIO<B> {
  concreteCounter(self)
  return self.counter != null ? f(self.counter) : self.counterRef!.getWith(f)
}

/**
 * @tsplus macro remove
 */
export function concreteCounter<A>(_: Counter<A>): asserts _ is InternalCounter<A> {
  //
}
