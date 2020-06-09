/* adapted from https://github.com/rzeigler/waveguide */

import * as A from "../Array"
import * as NA from "../NonEmptyArray"
import { none, some } from "../Option"
import * as O from "../Option"
import { Semigroup, fold as semigroupFold } from "../Semigroup"
import { Compact } from "../Utils"

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a,
    next: none
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

export type Cause<E = never> = Raise<E> | Abort | Interrupt

export interface Raise<E> {
  readonly _tag: "Raise"
  readonly error: E
  next: O.Option<Cause<unknown>>
}

export interface Abort {
  readonly _tag: "Abort"
  readonly abortedWith: unknown
  next: O.Option<Cause<unknown>>
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly causedBy: O.Option<Cause<unknown>>
  errors: O.Option<NA.NonEmptyArray<unknown>>
  next: O.Option<Cause<unknown>>
}

export function fold_<E, A, B1, B2, B3, B4>(
  e: Exit<E, A>,
  onDone: (v: A) => B1,
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B2,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B3,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B4
): Compact<B1 | B2 | B3 | B4>
export function fold_<E, A, B>(
  e: Exit<E, A>,
  onDone: (v: A) => B,
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B
): B {
  switch (e._tag) {
    case "Done":
      return onDone(e.value)
    case "Raise":
      return onRaise(e.error, e.next)
    case "Abort":
      return onAbort(e.abortedWith, e.next)
    case "Interrupt":
      return onInterrupt(e.errors, e.next)
  }
}

export function fold<E, A, B1, B2, B3, B4>(
  onDone: (v: A) => B1,
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B2,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B3,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B4
): (e: Exit<E, A>) => Compact<B1 | B2 | B3 | B4>
export function fold<E, A, B>(
  onDone: (v: A) => B,
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B
): (e: Exit<E, A>) => Compact<B> {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt)
}

export function foldCause<E, B1, B2, B3, B4>(
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B2,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B3,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B4
): (e: Cause<E>) => Compact<B1 | B2 | B3 | B4>
export function foldCause<E, B>(
  onRaise: (v: E, next: O.Option<Cause<unknown>>) => B,
  onAbort: (v: unknown, next: O.Option<Cause<unknown>>) => B,
  onInterrupt: (
    errors: O.Option<NA.NonEmptyArray<unknown>>,
    next: O.Option<Cause<unknown>>
  ) => B
): (e: Cause<E>) => B {
  return (e) =>
    isRaise(e)
      ? onRaise(e.error, e.next)
      : isAbort(e)
      ? onAbort(e.abortedWith, e.next)
      : onInterrupt(e.errors, e.next)
}

export function foldExit<E, A, B1, B2>(
  onCause: (v: Cause<E>) => B2,
  onDone: (v: A) => B1
): (e: Exit<E, A>) => Compact<B1 | B2>
export function foldExit<E, A, B>(
  onCause: (v: Cause<E>) => B,
  onDone: (v: A) => B
): (e: Exit<E, A>) => B {
  return (e) => (isDone(e) ? onDone(e.value) : onCause(e))
}

export const interrupt: Interrupt = {
  _tag: "Interrupt",
  next: none,
  errors: none,
  causedBy: none
}

export const interruptWithError = (...errors: ReadonlyArray<unknown>): Interrupt =>
  errors.length > 0
    ? {
        _tag: "Interrupt",
        errors: some(errors as NA.NonEmptyArray<unknown>),
        next: none,
        causedBy: none
      }
    : {
        _tag: "Interrupt",
        next: none,
        errors: none,
        causedBy: none
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
    next: none
  }
}

const append_ = <E>(root: Cause<E>, next: Cause<E>) => {
  if (root.next._tag === "None") {
    if (root._tag === "Interrupt" && next._tag === "Interrupt") {
      const combo = A.concat_(
        O.getOrElse_(root.errors, (): unknown[] => []),
        O.getOrElse_(next.errors, (): unknown[] => [])
      )

      root.errors = A.isNonEmpty(combo) ? O.some(combo) : O.none
    } else {
      root.next = some(next)
    }
  } else {
    append_(root.next.value, next)
  }
}

const append = <E>(root: Cause<E>, next: Cause<E>): Cause<E> => {
  append_(root, next)
  return root
}

const semigroupCause: Semigroup<Cause<any>> = {
  concat: append
}

export const combinedCause = <E = never>(_: Cause<E>) => (
  ...as: ReadonlyArray<Cause<unknown>>
): Cause<E> => semigroupFold(semigroupCause)(_, as)

export const causedBy = (_: Cause<unknown>) => (i: Interrupt): Interrupt => ({
  ...i,
  causedBy: some(_)
})

export const all = (f: (_: Cause<unknown>) => boolean) => <E>(_: Cause<E>): boolean =>
  _.next._tag === "None" ? f(_) : f(_) && all(f)(_.next.value)

export const ifAll = (f: (_: Cause<unknown>) => boolean) => <E, A, B>(
  onTrue: (_: Cause<E>) => A,
  onFalse: (_: Cause<E>) => B
) => (_: Cause<E>): A | B => (all(f)(_) ? onTrue(_) : onFalse(_))
