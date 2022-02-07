// ets_tracing: off

import "../../Operator/index.js"

export class AtomicReference<A> {
  private current: A

  constructor(readonly initial: A) {
    this.current = initial
  }

  get get() {
    return this.current
  }

  getAndSet(value: A) {
    const old = this.current

    this.set(value)
    return old
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
