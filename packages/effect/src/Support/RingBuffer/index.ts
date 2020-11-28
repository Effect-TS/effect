import * as L from "../../List"
import { DoublyLinkedList } from "../DublyLinkedList"

export class RingBuffer<T> {
  private values = new DoublyLinkedList<T>()

  constructor(readonly size: number) {}

  push(value: T) {
    if (this.values.length >= this.size) {
      this.values.shift()
    }
    this.values.add(value)
    return this.values
  }

  pop() {
    this.values.pop()
    return this.values
  }

  get list(): L.List<T> {
    let l = L.empty<T>()
    this.values.forEach((t) => {
      l = L.append_(l, t)
    })
    return l
  }
  get listReverse(): L.List<T> {
    let l = L.empty<T>()
    this.values.forEach((t) => {
      l = L.prepend_(l, t)
    })
    return l
  }
}
