import type { Chunk } from "../../../../../collection/immutable/Chunk"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicGauge } from "../../../atomic/AtomicGauge"
import { _A } from "../../../Metric"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { Gauge } from "../../definition"
import { GaugeSym } from "../../definition"

export class InternalGauge<A> implements Gauge<A>, St.HasHash, St.HasEquals {
  readonly [_A]: (_: A) => void;
  readonly [GaugeSym]: GaugeSym

  gauge: AtomicGauge | undefined
  gaugeRef: FiberRef<AtomicGauge> | undefined

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: Gauge<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.Gauge(this.name, this.tags)
    this.gauge = MetricClient.client.value.getGauge(key)
    this.gaugeRef = undefined
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
    return isGauge(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/GaugeOps isGauge
 */
export function isGauge(u: unknown): u is Gauge<any> {
  return typeof u === "object" && u != null && GaugeSym in u
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
  concreteGauge(self)
  return self.gauge != null ? f(self.gauge) : self.gaugeRef!.getWith(f)
}
