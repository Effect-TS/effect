import * as St from "../../../../../prelude/Structural"
import { Tuple, TupleSym } from "../../definition"

export class TupleInternal<T extends readonly unknown[]> implements Tuple<T> {
  readonly [TupleSym]: TupleSym = TupleSym

  constructor(readonly tuple: T) {}

  [Symbol.iterator](): IterableIterator<T[number]> {
    return this.tuple[Symbol.iterator]()
  }

  get [St.hashSym](): number {
    return St.hashArray(this.tuple)
  }

  [St.equalsSym](that: unknown): boolean {
    if (Tuple.isTuple(that)) {
      return (
        this.tuple.length === that.tuple.length &&
        this.tuple.every((v, i) => St.equals(v, that.tuple[i]))
      )
    }
    return false
  }

  get<K extends keyof T>(i: K): T[K] {
    return this.tuple[i]
  }
}
