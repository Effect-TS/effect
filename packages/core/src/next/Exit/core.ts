import * as A from "../../Array"
import * as E from "../../Either"
import { identity, pipe } from "../../Function"
import * as O from "../../Option"
import * as C from "../Cause/core"
import { FiberFailure } from "../Errors"
import { FiberID } from "../Fiber/id"

import { Exit, Failure, Success } from "./exit"

export { Exit, Failure, Success } from "./exit"

/**
 * Applicative's ap
 */
export const ap: <E, A>(
  fa: Exit<E, A>
) => <B>(fab: Exit<E, (a: A) => B>) => Exit<E, B> = (fa) => (fab) =>
  chain_(fab, (f) => map_(fa, (a) => f(a)))

/**
 * Replaces the success value with the one provided.
 */
export const as = <B>(b: B) => map(() => b)

/**
 * Maps over both the error and value type.
 */
export const bimap = <E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) => (
  exit: Exit<E, A>
) => pipe(exit, map(g), mapError(f))

/**
 * Flat maps over the value type.
 */
export const chain = <A, A1, E1>(f: (a: A) => Exit<E1, A1>) => <E>(
  exit: Exit<E, A>
): Exit<E | E1, A1> => {
  switch (exit._tag) {
    case "Failure": {
      return exit
    }
    case "Success": {
      return f(exit.value)
    }
  }
}

/**
 * Flat maps over the value type.
 */
export const chain_ = <E, A, A1, E1>(
  exit: Exit<E, A>,
  f: (a: A) => Exit<E1, A1>
): Exit<E | E1, A1> => {
  switch (exit._tag) {
    case "Failure": {
      return exit
    }
    case "Success": {
      return f(exit.value)
    }
  }
}

/**
 * Collects all the success states and merges sequentially the causes
 */
export const collectAll = <E, A>(
  ...exits: readonly Exit<E, A>[]
): O.Option<Exit<E, readonly A[]>> =>
  pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.dropLeft_(exits, 1),
        A.reduce(
          pipe(
            head,
            map((x): readonly A[] => [x])
          ),
          (acc, el) =>
            pipe(
              acc,
              zipWith(el, (acc, el) => [el, ...acc], C.Then)
            )
        ),
        map(A.reverse)
      )
    )
  )

/**
 * Zips this together with the specified result using the combination functions.
 */
export const zipWith_ = <E, E1, A, B, C>(
  exit: Exit<E, A>,
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
): Exit<E | E1, C> => {
  switch (exit._tag) {
    case "Failure": {
      switch (that._tag) {
        case "Success": {
          return exit
        }
        case "Failure": {
          return halt(g(exit.cause, that.cause))
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "Success": {
      switch (that._tag) {
        case "Success": {
          return succeed(f(exit.value, that.value))
        }
        case "Failure": {
          return that
        }
      }
    }
  }
}

/**
 * Zips this together with the specified result using the combination functions.
 */
export const zipWith = <E, E1, A, B, C>(
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
) => (exit: Exit<E, A>): Exit<E | E1, C> => zipWith_(exit, that, f, g)

/**
 * Collects all the success states and merges the causes in parallel
 */
export const collectAllPar = <E, A>(
  ...exits: readonly Exit<E, A>[]
): O.Option<Exit<E, readonly A[]>> =>
  pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.dropLeft_(exits, 1),
        A.reduce(
          pipe(
            head,
            map((x): readonly A[] => [x])
          ),
          (acc, el) =>
            pipe(
              acc,
              zipWith(el, (acc, el) => [el, ...acc], C.Both)
            )
        ),
        map(A.reverse)
      )
    )
  )

/**
 * Construct an Exit with an unchecked cause containing the specified error
 */
export const die = (error: unknown) => halt(C.Die(error))

/**
 * Returns f(a) if the exit is successful
 */
export const exists = <A>(f: (a: A) => boolean) => <E>(exit: Exit<E, A>): boolean =>
  pipe(
    exit,
    fold(() => false, f)
  )

/**
 * Constructs a failed exit with the specified checked error
 */
export const fail = <E>(e: E) => halt(C.Fail(e))

/**
 * Flatten nested Exits
 */
export const flatten = <E, E1, A>(exit: Exit<E, Exit<E1, A>>) =>
  pipe(exit, chain(identity))

/**
 * Folds over the value or cause.
 */
export const fold = <E, A, Z>(failed: (e: C.Cause<E>) => Z, succeed: (a: A) => Z) => (
  exit: Exit<E, A>
): Z => {
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
 * Folds over the value or cause.
 */
export const fold_ = <E, A, Z>(
  exit: Exit<E, A>,
  failed: (e: C.Cause<E>) => Z,
  succeed: (a: A) => Z
): Z => {
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
 * Embeds Either's Error & Success in an Exit
 */
export const fromEither = <E, A>(e: E.Either<E, A>): Exit<E, A> =>
  e._tag === "Left" ? fail(e.left) : succeed(e.right)

/**
 * Embeds an option result into an Exit with the specified error using onNone
 */
export const fromOption = <E>(onNone: () => E) => <A>(a: O.Option<A>): Exit<E, A> =>
  a._tag === "None" ? fail(onNone()) : succeed(a.value)

/**
 * Get successful result falling back to orElse result in case of failure
 */
export const getOrElse = <E, A1>(orElse: (_: C.Cause<E>) => A1) => <A>(
  exit: Exit<E, A>
): A | A1 => {
  switch (exit._tag) {
    case "Success": {
      return exit.value
    }
    case "Failure": {
      return orElse(exit.cause)
    }
  }
}

/**
 * Constructs a failed exit with the specified cause
 */
export const halt = <E>(cause: C.Cause<E>) => Failure(cause)

/**
 * Constructs an exit with the specified interruption state
 */
export const interrupt = (id: FiberID) => halt(C.Interrupt(id))

/**
 * Returns if Exit contains an interruption state
 */
export const interrupted = <E, A>(exit: Exit<E, A>): exit is Failure<E> => {
  switch (exit._tag) {
    case "Success": {
      return false
    }
    case "Failure": {
      return C.interrupted(exit.cause)
    }
  }
}

/**
 * Maps over the value type.
 */
export const map = <A, A1>(f: (a: A) => A1) => <E>(exit: Exit<E, A>): Exit<E, A1> =>
  pipe(
    exit,
    chain((a) => succeed(f(a)))
  )

/**
 * Maps over the value type.
 */
export const map_ = <E, A, A1>(exit: Exit<E, A>, f: (a: A) => A1): Exit<E, A1> =>
  pipe(
    exit,
    chain((a) => succeed(f(a)))
  )

/**
 * Maps over the error type.
 */
export const mapError = <E, E1>(f: (e: E) => E1) => <A>(
  exit: Exit<E, A>
): Exit<E1, A> => {
  switch (exit._tag) {
    case "Failure": {
      return halt(C.map(f)(exit.cause))
    }
    case "Success": {
      return exit
    }
  }
}

/**
 * Maps over the cause type.
 */
export const mapErrorCause = <E, E1>(f: (e: C.Cause<E>) => C.Cause<E1>) => <A>(
  exit: Exit<E, A>
): Exit<E1, A> => {
  switch (exit._tag) {
    case "Failure": {
      return halt(f(exit.cause))
    }
    case "Success": {
      return exit
    }
  }
}

/**
 * Replaces the error value with the one provided.
 */
export const orElseFail = <E1>(e: E1) => <E, A>(exit: Exit<E, A>) =>
  pipe(
    exit,
    mapError(() => e)
  )

/**
 * Construct a succeeded exit with the specified value
 */
export const succeed = <A>(a: A) => Success(a)

/**
 * Returns if an exit is succeeded
 */
export const succeeded = <E, A>(exit: Exit<E, A>): exit is Success<A> => {
  switch (exit._tag) {
    case "Failure": {
      return false
    }
    case "Success": {
      return true
    }
  }
}

/**
 * Converts the `Exit` to an `Either<FiberFailure, A>`, by wrapping the
 * cause in `FiberFailure` (if the result is failed).
 */
export const toEither = <E, A>(exit: Exit<E, A>): E.Either<FiberFailure<E>, A> => {
  switch (exit._tag) {
    case "Success": {
      return E.right(exit.value)
    }
    case "Failure": {
      return E.left(new FiberFailure(exit.cause))
    }
  }
}

/**
 * Discards the value.
 */
export const unit: Exit<never, void> = succeed(undefined)

/**
 * Sequentially zips the this result with the specified result or else returns the failed `Cause[E1]`
 */
export const zip = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, [A, B]> =>
  pipe(
    exit,
    zipWith(that, (a, b) => [a, b], C.Then)
  )

/**
 * Sequentially zips the this result with the specified result discarding the second element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipLeft = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, A> =>
  pipe(
    exit,
    zipWith(that, (a, _) => a, C.Then)
  )

/**
 * Parallelly zips the this result with the specified result or else returns the failed `Cause[E1]`
 */
export const zipPar = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, [A, B]> =>
  pipe(
    exit,
    zipWith(that, (a, b) => [a, b], C.Both)
  )

/**
 * Parallelly zips the this result with the specified result discarding the second element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipParLeft = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, A> =>
  pipe(
    exit,
    zipWith(that, (a, _) => a, C.Both)
  )

/**
 * Parallelly zips the this result with the specified result discarding the first element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipParRight = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, B> =>
  pipe(
    exit,
    zipWith(that, (_, b) => b, C.Both)
  )

/**
 * Sequentially zips the this result with the specified result discarding the first element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipRight = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, B> =>
  pipe(
    exit,
    zipWith(that, (_, b) => b, C.Then)
  )

/**
 * Sequentially zips the this result with the specified result discarding the first element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipRight_ = <E, A, E1, B>(
  exit: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, B> =>
  pipe(
    exit,
    zipWith(that, (_, b) => b, C.Then)
  )
