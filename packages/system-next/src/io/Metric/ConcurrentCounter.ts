import * as Tp from "../../collection/immutable/Tuple"
import { AtomicNumber } from "../../support/AtomicNumber"

export interface ConcurrentCounter {
  readonly count: number
  readonly increment: (v: number) => Tp.Tuple<[number, number]>
}

class ConcurrentCounterImpl implements ConcurrentCounter {
  readonly value = new AtomicNumber(0)

  get count(): number {
    return this.value.get
  }

  increment(v: number): Tp.Tuple<[number, number]> {
    this.value.set(this.value.get + v)
    return Tp.tuple(this.value.get, v)
  }
}

export function manual(): ConcurrentCounter {
  return new ConcurrentCounterImpl()
}
