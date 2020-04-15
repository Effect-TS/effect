import { effect as T } from "@matechs/effect";

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
  interruptWithErrorAndOthers,
  Cause,
  ExitTag,
  raise
} from "@matechs/effect/lib/original/exit";

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
  interruptWithErrorAndOthers,
  Cause,
  ExitTag,
  raise
};

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done";

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> => e._tag === "Raise";

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort";

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt => e._tag === "Interrupt";

function fold_<E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  e: Exit<E, A>,
  onDone: (v: A) => T.Effect<R1, E1, B1>,
  onRaise: (v: E) => T.Effect<R2, E2, B2>,
  onAbort: (v: unknown) => T.Effect<R3, E3, B3>,
  onInterrupt: (i: Interrupt) => T.Effect<R4, E4, B4>
): T.Effect<R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>;
function fold_<E, A, B1, B2, B3, B4>(
  e: Exit<E, A>,
  onDone: (v: A) => B1,
  onRaise: (v: E) => B2,
  onAbort: (v: unknown) => B3,
  onInterrupt: (i: Interrupt) => B4
): B1 | B2 | B3 | B4;
function fold_<E, A, B>(
  e: Exit<E, A>,
  onDone: (v: A) => B,
  onRaise: (v: E) => B,
  onAbort: (v: unknown) => B,
  onInterrupt: (i: Interrupt) => B
): B | B | B | B {
  switch (e._tag) {
    case "Done":
      return onDone(e.value);
    case "Raise":
      return onRaise(e.error);
    case "Abort":
      return onAbort(e.abortedWith);
    case "Interrupt":
      return onInterrupt(e);
  }
}

export const exit = {
  fold: fold_
};

export function fold<E, A, B1, B2, B3, B4, R1, E1, R2, E2, R3, E3, R4, E4>(
  onDone: (v: A) => T.Effect<R1, E1, B1>,
  onRaise: (v: E) => T.Effect<R2, E2, B2>,
  onAbort: (v: unknown) => T.Effect<R3, E3, B3>,
  onInterrupt: (i: Interrupt) => T.Effect<R4, E4, B4>
): (e: Exit<E, A>) => T.Effect<R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>;
export function fold<E, A, B1, B2, B3, B4>(
  onDone: (v: A) => B1,
  onRaise: (v: E) => B2,
  onAbort: (v: unknown) => B3,
  onInterrupt: (i: Interrupt) => B4
): (e: Exit<E, A>) => B1 | B2 | B3 | B4;
export function fold<E, A, B>(
  onDone: (v: A) => B,
  onRaise: (v: E) => B,
  onAbort: (v: unknown) => B,
  onInterrupt: (i: Interrupt) => B
): (e: Exit<E, A>) => B {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt);
}
