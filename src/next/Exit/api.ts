import * as C from "./_internal/cause"
import * as T from "./_internal/effect"
import * as Exit from "./core"

/**
 * Folds over the value or cause.
 */
export const foldM = <E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  failed: (e: C.Cause<E>) => T.Effect<S1, R1, E1, A1>,
  succeed: (a: A) => T.Effect<S2, R2, E2, A2>
) => (exit: Exit.Exit<E, A>): T.Effect<S1 | S2, R1 & R2, E1 | E2, A1 | A2> =>
  foldM_(exit, failed, succeed)

/**
 * Folds over the value or cause.
 */
export const foldM_ = <E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  exit: Exit.Exit<E, A>,
  failed: (e: C.Cause<E>) => T.Effect<S1, R1, E1, A1>,
  succeed: (a: A) => T.Effect<S2, R2, E2, A2>
): T.Effect<S1 | S2, R1 & R2, E1 | E2, A1 | A2> => {
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
export const foreach = <A2, S, R, E, A>(f: (a: A2) => T.Effect<S, R, E, A>) => <E2>(
  exit: Exit.Exit<E2, A2>
) => foreach_(exit, f)

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export const foreach_ = <E2, A2, S, R, E, A>(
  exit: Exit.Exit<E2, A2>,
  f: (a: A2) => T.Effect<S, R, E, A>
): T.Effect<S, R, never, Exit.Exit<E | E2, A>> => {
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
} from "./core"
