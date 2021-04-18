// tracing: off
import * as St from "../Structural"

export class Stack<A> implements St.HasEquals, St.HasHash {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}
