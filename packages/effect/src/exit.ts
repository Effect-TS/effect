import {
  Raise,
  Abort,
  Interrupt,
  Exit,
  Done,
  ExitTag
} from "waveguide/lib/exit";

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> =>
  e._tag === ExitTag.Done;

export const isRaise = <E, A>(e: Exit<E, A>): e is Raise<E> =>
  e._tag === ExitTag.Raise;

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort =>
  e._tag === ExitTag.Abort;

export const isInterrupt = <E, A>(e: Exit<E, A>): e is Interrupt =>
  e._tag === ExitTag.Interrupt;

function fold_<E, A, R>(
  e: Exit<E, A>,
  onDone: (v: A) => R,
  onRaise: (v: E) => R,
  onAbort: (v: unknown) => R,
  onInterrupt: () => R
) {
  switch (e._tag) {
    case ExitTag.Done:
      return onDone(e.value);
    case ExitTag.Raise:
      return onRaise(e.error);
    case ExitTag.Abort:
      return onAbort(e.abortedWith);
    case ExitTag.Interrupt:
      return onInterrupt();
  }
}

export const exit = {
  fold: fold_
};

export function fold<E, A, R>(
  onDone: (v: A) => R,
  onRaise: (v: E) => R,
  onAbort: (v: unknown) => R,
  onInterrupt: () => R
): (e: Exit<E, A>) => R {
  return e => fold_(e, onDone, onRaise, onAbort, onInterrupt);
}
