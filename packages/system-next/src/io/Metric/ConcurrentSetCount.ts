import * as C from "../../collection/immutable/Chunk/core"
import type { Next } from "../../collection/immutable/Map"
import * as Tp from "../../collection/immutable/Tuple"
import { AtomicNumber } from "../../support/AtomicNumber"

export interface ConcurrentSetCount {
  readonly getCount: () => number
  readonly getCountFor: (word: string) => number
  readonly observe: (word: string) => void
  readonly snapshot: () => C.Chunk<Tp.Tuple<[string, number]>>
}

class ConcurrentSetCountImpl implements ConcurrentSetCount {
  readonly count = new AtomicNumber(0)

  readonly values = new Map<string, AtomicNumber>()

  getCount(): number {
    return this.count.get
  }

  getCountFor(word: string): number {
    const count = this.values.get(word)
    if (count == null) {
      return 0
    }
    return count.get
  }

  observe(word: string): void {
    this.count.set(this.count.get + 1)

    let slot = this.values.get(word)

    if (slot == null) {
      const counter = new AtomicNumber(0)
      slot = counter
      this.values.set(word, counter)
    }

    slot.set(slot.get + 1)
  }

  snapshot(): C.Chunk<Tp.Tuple<[string, number]>> {
    const builder = C.builder<Tp.Tuple<[string, number]>>()

    const iterator = this.values[Symbol.iterator]()

    let next: Next<[string, AtomicNumber]>
    while (!(next = iterator.next()).done) {
      builder.append(Tp.tuple(next.value[0], next.value[1].get))
    }

    return builder.build()
  }
}

export function manual(): ConcurrentSetCount {
  return new ConcurrentSetCountImpl()
}
