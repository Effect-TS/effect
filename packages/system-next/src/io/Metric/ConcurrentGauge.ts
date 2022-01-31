import { Tuple } from "../../collection/immutable/Tuple"
import { AtomicReference } from "../../support/AtomicReference"

export interface ConcurrentGauge {
  readonly get: number
  readonly set: (v: number) => Tuple<[number, number]>
  readonly adjust: (v: number) => Tuple<[number, number]>
}

class ConcurrentGaugeImpl implements ConcurrentGauge {
  readonly value = new AtomicReference(this.startAt)

  constructor(readonly startAt: number) {}

  get get(): number {
    return this.value.get
  }

  set(v: number): Tuple<[number, number]> {
    const old = this.value.getAndSet(v)
    return Tuple(v, v - old)
  }

  adjust(v: number): Tuple<[number, number]> {
    this.value.set(this.value.get + v)
    return Tuple(this.value.get, v)
  }
}

export function manual(startAt: number): ConcurrentGauge {
  return new ConcurrentGaugeImpl(startAt)
}
