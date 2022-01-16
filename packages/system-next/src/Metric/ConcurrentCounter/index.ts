// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { AtomicNumber } from "../../Support/AtomicNumber"

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
