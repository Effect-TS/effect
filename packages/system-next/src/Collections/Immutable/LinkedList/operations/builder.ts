import { ListBuffer } from "../../../Mutable/ListBuffer"

export class LinkedListBuilder<A> {
  constructor(private buffer: ListBuffer<A>) {}

  append(a: A): LinkedListBuilder<A> {
    this.buffer.append(a)
    return this
  }

  build() {
    return this.buffer.toList
  }
}

export function builder<A>(): LinkedListBuilder<A> {
  return new LinkedListBuilder(new ListBuffer())
}
