import * as L from "../../List"

export class RingBuffer<T> {
  private values = L.empty<T>()

  constructor(readonly size: number) {}

  push(value: T) {
    if (this.values.length >= this.size) {
      this.pop()
    }
    this.values = L.append_(this.values, value)
    return this.values
  }

  pop() {
    this.values = L.drop_(this.values, 1)
    return this.values
  }

  popHead() {
    this.values = L.dropLast_(this.values, 1)
    return this.values
  }

  get list() {
    return this.values
  }
}
