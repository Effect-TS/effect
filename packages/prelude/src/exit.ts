import {
  effect as T,
  stream as S,
  managed as M,
  streameither as SE
} from "@matechs/effect"
// from effect just retyped
/* istanbul ignore file */
import {
  Raise,
  Abort,
  Interrupt,
  Exit,
  Done,
  done,
  abort,
  interrupt,
  interruptWithError,
  withRemaining,
  Cause,
  ExitTag,
  raise
} from "@matechs/effect/lib/original/exit"

export {
  Raise,
  Abort,
  Interrupt,
  Exit,
  Done,
  done,
  abort,
  interrupt,
  interruptWithError,
  withRemaining,
  Cause,
  ExitTag,
  raise
}

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done"

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> => e._tag === "Raise"

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort"

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt =>
  e._tag === "Interrupt"

function fold_<S1, S2, S3, S4, E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  e: Exit<E, A>,
  onDone: (v: A) => T.Effect<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => T.Effect<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => T.Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => T.Effect<S4, R4, E4, B4>
): T.Effect<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
function fold_<S1, S2, S3, S4, E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  e: Exit<E, A>,
  onDone: (v: A) => M.Managed<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => M.Managed<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => M.Managed<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => M.Managed<S4, R4, E4, B4>
): M.Managed<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
function fold_<S1, S2, S3, S4, E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  e: Exit<E, A>,
  onDone: (v: A) => S.Stream<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => S.Stream<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => S.Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => S.Stream<S4, R4, E4, B4>
): S.Stream<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
function fold_<S1, S2, S3, S4, E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  e: Exit<E, A>,
  onDone: (v: A) => SE.StreamEither<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => SE.StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S4, R4, E4, B4>
): SE.StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
function fold_<E, A, B1, B2, B3, B4>(
  e: Exit<E, A>,
  onDone: (v: A) => B1,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B2,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B3,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B4
): B1 | B2 | B3 | B4
function fold_<E, A, B>(
  e: Exit<E, A>,
  onDone: (v: A) => B,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B
): B | B | B | B {
  switch (e._tag) {
    case "Done":
      return onDone(e.value)
    case "Raise":
      return onRaise(e.error, e.remaining)
    case "Abort":
      return onAbort(e.abortedWith, e.remaining)
    case "Interrupt":
      return onInterrupt(e, e.remaining)
  }
}

export const exit = {
  fold: fold_
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
  onDone: (v: A) => T.Effect<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => T.Effect<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => T.Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => T.Effect<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => T.Effect<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onDone: (v: A) => M.Managed<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => M.Managed<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => M.Managed<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => M.Managed<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => M.Managed<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onDone: (v: A) => S.Stream<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => S.Stream<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => S.Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => S.Stream<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => S.Stream<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onDone: (v: A) => SE.StreamEither<S1, R1, E1, B1>,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => SE.StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S4, R4, E4, B4>
): (
  e: Exit<E, A>
) => SE.StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function fold<E, A, B1, B2, B3, B4>(
  onDone: (v: A) => B1,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B2,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B3,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B4
): (e: Exit<E, A>) => B1 | B2 | B3 | B4
export function fold<E, A, B>(
  onDone: (v: A) => B,
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B
): (e: Exit<E, A>) => B {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt)
}

export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => SE.StreamEither<S2, R2, E2, B2>,
  onDone: (v: A) => SE.StreamEither<S1, R1, E1, B1>
): (e: Exit<E, A>) => SE.StreamEither<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => S.Stream<S2, R2, E2, B2>,
  onDone: (v: A) => S.Stream<S1, R1, E1, B1>
): (e: Exit<E, A>) => S.Stream<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => M.Managed<S2, R2, E2, B2>,
  onDone: (v: A) => M.Managed<S1, R1, E1, B1>
): (e: Exit<E, A>) => M.Managed<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => T.Effect<S2, R2, E2, B2>,
  onDone: (v: A) => T.Effect<S1, R1, E1, B1>
): (e: Exit<E, A>) => T.Effect<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
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
  onRaise: (v: E, remaining?: Array<Cause<any>>) => T.Effect<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => T.Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => T.Effect<S4, R4, E4, B4>
): (
  e: Cause<E>
) => T.Effect<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onRaise: (v: E, remaining?: Array<Cause<any>>) => M.Managed<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => M.Managed<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => M.Managed<S4, R4, E4, B4>
): (
  e: Cause<E>
) => M.Managed<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onRaise: (v: E, remaining?: Array<Cause<any>>) => S.Stream<S2, R2, E2, B2>,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => S.Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => S.Stream<S4, R4, E4, B4>
): (
  e: Cause<E>
) => S.Stream<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
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
  onRaise: (v: E, remaining?: Array<Cause<any>>) => SE.StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S3, R3, E3, B3>,
  onInterrupt: (
    i: Interrupt,
    remaining?: Array<Cause<any>>
  ) => SE.StreamEither<S4, R4, E4, B4>
): (
  e: Cause<E>
) => SE.StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function foldCause<E, B1, B2, B3, B4>(
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B2,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B3,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B4
): (e: Cause<E>) => B1 | B2 | B3 | B4
export function foldCause<E, B>(
  onRaise: (v: E, remaining?: Array<Cause<any>>) => B,
  onAbort: (v: unknown, remaining?: Array<Cause<any>>) => B,
  onInterrupt: (i: Interrupt, remaining?: Array<Cause<any>>) => B
): (e: Cause<E>) => B {
  return (e) =>
    isRaise(e)
      ? onRaise(e.error, e.remaining)
      : isAbort(e)
      ? onAbort(e.abortedWith, e.remaining)
      : onInterrupt(e, e.remaining)
}
