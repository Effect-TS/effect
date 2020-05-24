/* adapted from https://github.com/rzeigler/waveguide */

import type { NonEmptyArray } from "../NonEmptyArray"
import { none, some } from "../Option"
import type { Option } from "../Option"
import type { Effect, Managed, Stream, StreamEither } from "../Support/Common/types"

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a,
    remaining: none
  }
}

export function done<A>(v: A): Done<A> {
  return {
    _tag: "Done",
    value: v
  }
}

export type Exit<E, A> = Done<A> | Cause<E>
export type ExitTag = Exit<unknown, unknown>["_tag"]

export interface Done<A> {
  readonly _tag: "Done"
  readonly value: A
}

export type Cause<E> = Raise<E> | Abort | Interrupt

export interface Raise<E> {
  readonly _tag: "Raise"
  readonly error: E
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export interface Abort {
  readonly _tag: "Abort"
  readonly abortedWith: unknown
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly errors?: Error[]
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export function fold_<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  e: Exit<E, A>,
  onDone: (v: A) => Effect<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Effect<S4, R4, E4, B4>
): Effect<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold_<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  e: Exit<E, A>,
  onDone: (v: A) => Managed<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Managed<S4, R4, E4, B4>
): Managed<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold_<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  e: Exit<E, A>,
  onDone: (v: A) => Stream<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Stream<S4, R4, E4, B4>
): Stream<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold_<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  e: Exit<E, A>,
  onDone: (v: A) => StreamEither<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => StreamEither<S4, R4, E4, B4>
): StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function fold_<E, A, B1, B2, B3, B4>(
  e: Exit<E, A>,
  onDone: (v: A) => B1,
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B2,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B3,
  onInterrupt: (i: Interrupt) => B4
): B1 | B2 | B3 | B4
export function fold_<E, A, B>(
  e: Exit<E, A>,
  onDone: (v: A) => B,
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onInterrupt: (i: Interrupt) => B
): B | B | B | B {
  switch (e._tag) {
    case "Done":
      return onDone(e.value)
    case "Raise":
      return onRaise(e.error, e.remaining)
    case "Abort":
      return onAbort(e.abortedWith, e.remaining)
    case "Interrupt":
      return onInterrupt(e)
  }
}

export function fold<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onDone: (v: A) => Effect<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Effect<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => Effect<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onDone: (v: A) => Managed<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Managed<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => Managed<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onDone: (v: A) => Stream<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Stream<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => Stream<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function fold<
  S1,
  S2,
  S3,
  S4,
  E,
  A,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onDone: (v: A) => StreamEither<S1, R1, E1, B1>,
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => StreamEither<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function fold<E, A, B1, B2, B3, B4>(
  onDone: (v: A) => B1,
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B2,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B3,
  onInterrupt: (i: Interrupt) => B4
): (e: Exit<E, A>) => B1 | B2 | B3 | B4
export function fold<E, A, B>(
  onDone: (v: A) => B,
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onInterrupt: (i: Interrupt) => B
): (e: Exit<E, A>) => B {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt)
}

export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Effect<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Effect<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Managed<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Managed<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Stream<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Stream<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => StreamEither<S4, R4, E4, B4>
): (
  e: Cause<E>
) => StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function foldCause<E, B1, B2, B3, B4>(
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B2,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B3,
  onInterrupt: (i: Interrupt) => B4
): (e: Cause<E>) => B1 | B2 | B3 | B4
export function foldCause<E, B>(
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onInterrupt: (i: Interrupt) => B
): (e: Cause<E>) => B {
  return (e) =>
    isRaise(e)
      ? onRaise(e.error, e.remaining)
      : isAbort(e)
      ? onAbort(e.abortedWith, e.remaining)
      : onInterrupt(e)
}

export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => StreamEither<S2, R2, E2, B2>,
  onDone: (v: A) => StreamEither<S1, R1, E1, B1>
): (e: Exit<E, A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Stream<S2, R2, E2, B2>,
  onDone: (v: A) => Stream<S1, R1, E1, B1>
): (e: Exit<E, A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Managed<S2, R2, E2, B2>,
  onDone: (v: A) => Managed<S1, R1, E1, B1>
): (e: Exit<E, A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Effect<S2, R2, E2, B2>,
  onDone: (v: A) => Effect<S1, R1, E1, B1>
): (e: Exit<E, A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<E, A, B1, B2>(
  onCause: (v: Cause<E>) => B2,
  onDone: (v: A) => B1
): (e: Exit<E, A>) => B1 | B2
export function foldExit<E, A, B1, B2>(
  onCause: (v: Cause<E>) => B2,
  onDone: (v: A) => B1
): (e: Exit<E, A>) => B1 | B2
export function foldExit<E, A, B>(
  onCause: (v: Cause<E>) => B,
  onDone: (v: A) => B
): (e: Exit<E, A>) => B {
  return (e) => (isDone(e) ? onDone(e.value) : onCause(e))
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

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort"

export const isCause = <E, A>(e: Exit<E, A>): e is Cause<E> => e._tag !== "Done"

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done"

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt =>
  e._tag === "Interrupt"

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> => e._tag === "Raise"

export function raise<E>(e: E): Raise<E> {
  return {
    _tag: "Raise",
    error: e,
    remaining: none
  }
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
