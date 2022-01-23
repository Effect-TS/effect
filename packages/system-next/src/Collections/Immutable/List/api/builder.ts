import { ListBuffer } from "../../../Mutable/ListBuffer"

export class ListBuilder<A> {
  constructor(private buffer: ListBuffer<A>) {}

  append(a: A): ListBuilder<A> {
    this.buffer.append(a)
    return this
  }

  build() {
    return this.buffer.toList
  }
}

export function builder<A>(): ListBuilder<A> {
  return new ListBuilder(new ListBuffer())
}
