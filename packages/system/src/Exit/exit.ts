// ets_tracing: off

import type * as C from "../Cause/index.js"
import * as St from "../Structural/index.js"

export type Exit<E, A> = Success<A> | Failure<E>

export class Success<A> implements St.HasEquals {
  readonly _tag = "Success"
  constructor(readonly value: A) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Success && St.equals(this.value, that.value)
  }
}

export class Failure<E> {
  readonly _tag = "Failure"
  constructor(readonly cause: C.Cause<E>) {}

  get [St.hashSym](): number {
    return St.hash(this.cause)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Failure && St.equals(this.cause, that.cause)
  }
}
