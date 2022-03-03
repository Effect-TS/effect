import type { Chunk } from "../../../../../collection/immutable/Chunk"
import type { Duration } from "../../../../../data/Duration"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicSummary } from "../../../atomic/AtomicSummary"
import { _A } from "../../../Metric"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { Summary } from "../../definition"
import { SummarySym } from "../../definition"

export class InternalSummary<A> implements Summary<A>, St.HasHash, St.HasEquals {
  readonly [_A]: (_: A) => void;
  readonly [SummarySym]: SummarySym = SummarySym

  summary: AtomicSummary | undefined
  summaryRef: FiberRef<AtomicSummary> | undefined

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
    const key = MetricKey.Summary(name, maxSize, maxAge, error, quantiles, tags)
    this.summary = MetricClient.client.value.getSummary(key)
    this.summaryRef = undefined
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this)
  }

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(
        St.hashNumber(this.maxSize),
        St.combineHash(
          St.hash(this.maxAge),
          St.combineHash(
            St.hashNumber(this.error),
            St.combineHash(St.hash(this.quantiles), St.hash(this.tags))
          )
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isSummary(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/SummaryOps isSummary
 */
export function isSummary(u: unknown): u is Summary<any> {
  return typeof u === "object" && u != null && SummarySym in u
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
  concreteSummary(self)
  return self.summary != null ? f(self.summary) : self.summaryRef!.getWith(f)
}
