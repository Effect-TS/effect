// tracing: off

import * as St from "../Structural"

export class FiberRef<A> implements St.HasHash, St.HasEquals {
  constructor(
    readonly initial: A,
    readonly fork: (a: A) => A,
    readonly join: (a: A, a1: A) => A
  ) {}

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}
