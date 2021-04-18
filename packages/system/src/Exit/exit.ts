// tracing: off

import type * as C from "../Cause"

export type Exit<E, A> = Success<A> | Failure<E>

export class Success<A> {
  readonly _tag = "Success"
  constructor(readonly value: A) {}
}

export class Failure<E> {
  readonly _tag = "Failure"
  constructor(readonly cause: C.Cause<E>) {}
}
