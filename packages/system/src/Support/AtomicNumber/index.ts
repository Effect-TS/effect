// ets_tracing: off

import "../../Operator/index.js"

import { AtomicReference } from "../AtomicReference/index.js"

export class AtomicNumber extends AtomicReference<number> {
  constructor(n: number) {
    super(n)

    this.incrementAndGet = this.incrementAndGet.bind(this)
    this.decrementAndGet = this.decrementAndGet.bind(this)
  }

  incrementAndGet() {
    this.set(this.get + 1)
    return this.get
  }

  decrementAndGet() {
    this.set(this.get - 1)
    return this.get
  }

  getAndIncrement(): number {
    const ret = this.get

    this.set(this.get + 1)

    return ret
  }
}
