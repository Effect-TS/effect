import {
  Raise,
  Abort,
  Interrupt,
  Exit,
  Done,
  done,
  abort,
  interrupt,
  withErrors,
  Cause,
  ExitTag,
  raise
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
  withErrors,
  Cause,
  ExitTag,
  raise
};

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done";

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> => e._tag === "Raise";

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort";

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt => e._tag === "Interrupt";

function fold_<E, A, R>(
  e: Exit<E, A>,
  onDone: (v: A, errors?: Array<Error>) => R,
  onRaise: (v: E, errors?: Array<Error>) => R,
  onAbort: (v: unknown, errors?: Array<Error>) => R,
  onInterrupt: (i: Interrupt, errors?: Array<Error>) => R
) {
  switch (e._tag) {
    case "Done":
      return onDone(e.value, e.errors);
    case "Raise":
      return onRaise(e.error, e.errors);
    case "Abort":
      return onAbort(e.abortedWith, e.errors);
    case "Interrupt":
      return onInterrupt(e, e.errors);
  }
}

export const exit = {
  fold: fold_
};

export function fold<E, A, R>(
  onDone: (v: A, errors?: Array<Error>) => R,
  onRaise: (v: E, errors?: Array<Error>) => R,
  onAbort: (v: unknown, errors?: Array<Error>) => R,
  onInterrupt: (i: Interrupt, errors?: Array<Error>) => R
): (e: Exit<E, A>) => R {
  return (e) => fold_(e, onDone, onRaise, onAbort, onInterrupt);
}
