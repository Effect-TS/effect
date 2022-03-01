// import type { Chunk } from "../../collection/immutable/Chunk"
import { Tuple } from "../../collection/immutable/Tuple"
// import type { Option } from "../../data/Option"
import { AtomicNumber } from "../../support/AtomicNumber"
import type { MetricKey } from "./MetricKey"
import { MetricSnapshot } from "./MetricSnapshot"
// import type { MetricLabel } from "./MetricLabel"
// import { MetricType } from "./MetricType"

/**
 * @tsplus type ets/MetricState
 */
export type MetricState = CounterState

export declare namespace MetricState {
  type Counter = CounterState
}

/**
 * @tsplus type ets/MetricStateOps
 */
export interface MetricStateOps {}
export const MetricState: MetricStateOps = {}

export class CounterState {
  readonly _tag = "Counter"

  #value = new AtomicNumber(0)

  constructor(readonly key: MetricKey.Counter, readonly help: string) {}

  get count(): number {
    return this.#value.get
  }

  increment(value: number): Tuple<[number, number]> {
    this.#value.set(this.#value.get + value)
    return Tuple(this.#value.get, value)
  }
}

// TODO: return type?
/**
 * @tsplus static ets/MetricStateOps Counter
 */
export function counter(key: MetricKey.Counter, help: string): MetricState {
  return new CounterState(key, help)
}

/**
 * @tsplus fluent ets/MetricState snapshot
 */
export function snapshot(self: MetricState): MetricSnapshot {
  switch (self._tag) {
    case "Counter": {
      return MetricSnapshot.Counter(self.key, self.help, self.count)
    }
  }
}
