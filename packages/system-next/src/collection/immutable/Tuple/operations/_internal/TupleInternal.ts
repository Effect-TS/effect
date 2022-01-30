import * as St from "../../../../../prelude/Structural"
import { Tuple, TupleSym } from "../../definition"

export class TupleInternal<T extends readonly unknown[]> implements Tuple<T> {
  readonly [TupleSym]: TupleSym = TupleSym

  constructor(readonly value: T) {}

  [Symbol.iterator](): IterableIterator<T[number]> {
    return this.value[Symbol.iterator]()
  }

  get [St.hashSym](): number {
    return St.hashArray(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    if (Tuple.isTuple(that)) {
      return (
        this.value.length === that.value.length &&
        this.value.every((v, i) => St.equals(v, that.value[i]))
      )
    }
    return false
  }

  get<K extends keyof T>(i: K): T[K] {
    return this.value[i]
  }
}
