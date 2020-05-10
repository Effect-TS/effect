import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"

import { none, Option, some } from "../Option"

export type Exit<E, A> = Done<A> | Cause<E>
export type ExitTag = Exit<unknown, unknown>["_tag"]

export interface Done<A> {
  readonly _tag: "Done"
  readonly value: A
}

export function done<A>(v: A): Done<A> {
  return {
    _tag: "Done",
    value: v
  }
}

export type Cause<E> = Raise<E> | Abort | Interrupt

export interface Raise<E> {
  readonly _tag: "Raise"
  readonly error: E
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export function raise<E>(e: E): Raise<E> {
  return {
    _tag: "Raise",
    error: e,
    remaining: none
  }
}

export interface Abort {
  readonly _tag: "Abort"
  readonly abortedWith: unknown
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a,
    remaining: none
  }
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly errors?: Error[]
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export const interrupt: Interrupt = {
  _tag: "Interrupt",
  remaining: none
}

export const interruptWithError = (...errors: Array<Error>): Interrupt =>
  errors.length > 0
    ? {
        _tag: "Interrupt",
        errors,
        remaining: none
      }
    : {
        _tag: "Interrupt",
        remaining: none
      }

export const withRemaining = <E>(
  cause: Cause<E>,
  ...remaining: Array<Cause<any>>
): Cause<E> => {
  const rem =
    cause.remaining._tag === "Some"
      ? [...cause.remaining.value, ...remaining]
      : remaining

  return rem.length > 0
    ? {
        ...cause,
        remaining: some(rem as NonEmptyArray<Cause<any>>)
      }
    : cause
}
