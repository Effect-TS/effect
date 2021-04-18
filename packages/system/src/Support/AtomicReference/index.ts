// tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class AtomicReference<A> implements St.HasEquals, St.HasHash {
  private current: A

  constructor(readonly initial: A) {
    this.current = initial
  }

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }

  get get() {
    return this.current
  }

  set(value: A) {
    this.current = value
  }

  compareAndSet(old: A, value: A) {
    if (this.get === old) {
      this.set(value)
      return true
    }
    return false
  }
}
