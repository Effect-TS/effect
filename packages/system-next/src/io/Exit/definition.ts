import * as St from "../../prelude/Structural"
import type { Cause } from "../Cause"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

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

  constructor(readonly cause: Cause<E>) {}

  get [St.hashSym](): number {
    return St.hash(this.cause)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Failure && St.equals(this.cause, that.cause)
  }
}
