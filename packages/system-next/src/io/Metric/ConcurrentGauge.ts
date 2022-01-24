import * as Tp from "../../collection/immutable/Tuple"
import { AtomicReference } from "../../support/AtomicReference"

export interface ConcurrentGauge {
  readonly get: number
  readonly set: (v: number) => Tp.Tuple<[number, number]>
  readonly adjust: (v: number) => Tp.Tuple<[number, number]>
}

class ConcurrentGaugeImpl implements ConcurrentGauge {
  readonly value = new AtomicReference(this.startAt)

  constructor(readonly startAt: number) {}

  get get(): number {
    return this.value.get
  }

  set(v: number): Tp.Tuple<[number, number]> {
    const old = this.value.getAndSet(v)
    return Tp.tuple(v, v - old)
  }

  adjust(v: number): Tp.Tuple<[number, number]> {
    this.value.set(this.value.get + v)
    return Tp.tuple(this.value.get, v)
  }
}

export function manual(startAt: number): ConcurrentGauge {
  return new ConcurrentGaugeImpl(startAt)
}
