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
  raise,
} from "./original/exit";

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
  raise,
};

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done";

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> =>
  e._tag === "Raise";

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort";

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt =>
  e._tag === "Interrupt";

function fold_<E, A, R>(
  e: Exit<E, A>,
  onDone: (v: A) => R,
  onRaise: (v: E) => R,
  onAbort: (v: unknown) => R,
  onInterrupt: (i: Interrupt) => R
) {
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
  fold: fold_,
};

export function fold<E, A, R>(
  onDone: (v: A) => R,
  onRaise: (v: E) => R,
  onAbort: (v: unknown) => R,
  onInterrupt: () => R
): (e: Exit<E, A>) => R {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt);
}
