import type { Chunk } from "../../../../../collection/immutable/Chunk"
import * as St from "../../../../../prelude/Structural"
import type { Effect, UIO } from "../../../../Effect"
import type { FiberRef } from "../../../../FiberRef"
import type { AtomicSetCount } from "../../../atomic/AtomicSetCount"
import { _A } from "../../../Metric/definition"
import { MetricClient } from "../../../MetricClient"
import { MetricKey } from "../../../MetricKey"
import type { MetricLabel } from "../../../MetricLabel"
import type { SetCount } from "../../definition"
import { SetCountSym } from "../../definition"

export class InternalSetCount<A> implements SetCount<A>, St.HasHash, St.HasEquals {
  readonly [_A]!: (_: A) => void;
  readonly [SetCountSym]: SetCountSym = SetCountSym

  setCount: AtomicSetCount | undefined
  setCountRef: FiberRef<AtomicSetCount> | undefined

  constructor(
    readonly name: string,
    readonly setTag: string,
    readonly tags: Chunk<MetricLabel>,
    readonly aspect: (
      self: SetCount<A>
    ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
  ) {
    const key = MetricKey.SetCount(this.name, this.setTag, this.tags)
    this.setCount = MetricClient.client.value.getSetCount(key)
    this.setCountRef = undefined
  }

  get appliedAspect(): <R, E, A1 extends A>(
    effect: Effect<R, E, A1>
  ) => Effect<R, E, A1> {
    return this.aspect(this)
  }

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hashString(this.setTag), St.hash(this.tags))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isSetCount(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/SetCountOps isSetCount
 */
export function isSetCount(u: unknown): u is SetCount<any> {
  return typeof u === "object" && u != null && SetCountSym in u
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
  concreteSetCount(self)
  return self.setCount != null ? f(self.setCount) : self.setCountRef!.getWith(f)
}
