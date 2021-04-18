// tracing: off

import "../../Operator"

import type * as Chunk from "../../Collections/Immutable/Chunk"
import * as St from "../../Structural"

export abstract class Subscription<A> implements St.HasHash, St.HasEquals {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): Chunk.Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void

  [St.hashSym]() {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown) {
    return this === that
  }
}

export abstract class Hub<A> implements St.HasHash, St.HasEquals {
  abstract readonly capacity: number
  abstract isEmpty(): boolean
  abstract isFull(): boolean
  abstract publish(a: A): boolean
  abstract publishAll(as: Iterable<A>): Chunk.Chunk<A>
  abstract size(): number
  abstract slide(): void
  abstract subscribe(): Subscription<A>

  [St.hashSym]() {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown) {
    return this === that
  }
}
