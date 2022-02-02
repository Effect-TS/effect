// ets_tracing: off

import type * as C from "./_internal/cause.js"
import * as T from "./_internal/effect.js"
import * as Exit from "./core.js"

/**
 * Folds over the value or cause.
 */
export function foldM<E, A, R1, E1, A1, R2, E2, A2>(
  failed: (e: C.Cause<E>) => T.Effect<R1, E1, A1>,
  succeed: (a: A) => T.Effect<R2, E2, A2>
) {
  return (exit: Exit.Exit<E, A>): T.Effect<R1 & R2, E1 | E2, A1 | A2> =>
    foldM_(exit, failed, succeed)
}

/**
 * Folds over the value or cause.
 */
export function foldM_<E, A, R1, E1, A1, R2, E2, A2>(
  exit: Exit.Exit<E, A>,
  failed: (e: C.Cause<E>) => T.Effect<R1, E1, A1>,
  succeed: (a: A) => T.Effect<R2, E2, A2>
): T.Effect<R1 & R2, E1 | E2, A1 | A2> {
  switch (exit._tag) {
    case "Success": {
      return succeed(exit.value)
    }
    case "Failure": {
      return failed(exit.cause)
    }
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function forEach<A2, R, E, A>(f: (a: A2) => T.Effect<R, E, A>) {
  return <E2>(exit: Exit.Exit<E2, A2>) => forEach_(exit, f)
}

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function forEach_<E2, A2, R, E, A>(
  exit: Exit.Exit<E2, A2>,
  f: (a: A2) => T.Effect<R, E, A>
): T.Effect<R, never, Exit.Exit<E | E2, A>> {
  switch (exit._tag) {
    case "Failure": {
      return T.succeed(Exit.halt(exit.cause))
    }
    case "Success": {
      return T.result(f(exit.value))
    }
  }
}

export {
  Exit,
  succeed,
  Success,
  Failure,
  halt,
  ap,
  as,
  chain,
  collectAll,
  flatten,
  fold,
  interrupt,
  interrupted,
  map,
  mapErrorCause,
  zipWith,
  bimap,
  chain_,
  collectAllPar,
  die,
  exists,
  fail,
  fold_,
  fromEither,
  fromOption,
  getOrElse,
  mapError,
  map_,
  orElseFail,
  succeeded,
  toEither,
  unit,
  zip,
  zipLeft,
  zipPar,
  zipParLeft,
  zipParRight,
  zipRight,
  zipRight_,
  zipWith_
} from "./core.js"
