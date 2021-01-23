import type * as C from "../Cause"

export type Exit<E, A> = Success<A> | Failure<E>

export interface Success<A> {
  readonly _tag: "Success"
  readonly value: A
}

export interface Failure<E> {
  readonly _tag: "Failure"
  readonly cause: C.Cause<E>
}

export const Success = <A>(value: A): Exit<never, A> => ({
  _tag: "Success",
  value
})

export const Failure = <E>(cause: C.Cause<E>): Exit<E, never> => ({
  _tag: "Failure",
  cause
})
