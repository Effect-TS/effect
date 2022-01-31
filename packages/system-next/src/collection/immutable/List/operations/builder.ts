import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Builder
 *
 * @ets static ets/ListOps builder
 */
export function builder<A>(): ListBuilder<A> {
  return new ListBuilder(MutableList.emptyPushable())
}

export class ListBuilder<A> {
  constructor(private chunk: MutableList<A>) {}

  append(a: A): ListBuilder<A> {
    this.chunk.push(a)
    return this
  }

  build(): List<A> {
    return this.chunk
  }
}
