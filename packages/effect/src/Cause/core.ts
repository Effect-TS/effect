import * as A from "../Array"
import * as E from "../Either"
import type { FiberID } from "../Fiber/id"
import { identity, pipe } from "../Function"
import * as O from "../Option"
import type { Cause } from "./cause"
import { Both, Empty, Fail, Then } from "./cause"
import { equalsCause } from "./eq"
import { InterruptedException } from "./errors"

export { Both, Cause, Empty, Fail, Then, Die, Interrupt } from "./cause"

/**
 * Applicative's ap
 */
export const ap: <A>(fa: Cause<A>) => <B>(fab: Cause<(a: A) => B>) => Cause<B> = (fa) =>
  chain((f) => pipe(fa, map(f)))

/**
 * Substitute the E in the cause
 */
export const as = <E1>(e: E1) => map(() => e)

/**
 * Builds a Cause depending on the result of another
 */
export const chain = <E, E1>(f: (_: E) => Cause<E1>) => (
  cause: Cause<E>
): Cause<E1> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return f(cause.value)
    }
    case "Die": {
      return cause
    }
    case "Interrupt": {
      return cause
    }
    case "Then": {
      return Then(chain(f)(cause.left), chain(f)(cause.right))
    }
    case "Both": {
      return Both(chain(f)(cause.left), chain(f)(cause.right))
    }
  }
}

/**
 * Equivalent to chain((a) => Fail(f(a)))
 */
export const map = <E, E1>(f: (e: E) => E1) => chain((e: E) => Fail(f(e)))

/**
 * Determines if this cause contains or is equal to the specified cause.
 */
export const contains = <E, E1 extends E = E>(that: Cause<E1>) => (cause: Cause<E>) =>
  equalsCause(that, cause) ||
  pipe(
    cause,
    foldLeft(false)((_, c) => (equalsCause(that, c) ? O.some(true) : O.none))
  )

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export const defects = <E>(cause: Cause<E>): readonly unknown[] =>
  pipe(
    cause,
    foldLeft<readonly unknown[]>([])((a, c) =>
      c._tag === "Die" ? O.some([...a, c.value]) : O.none
    )
  )

/**
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export const dieOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Die" ? O.some(c.value) : O.none))
  )

/**
 * Returns if a cause contains a defect
 */
export const died = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export const failureOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Fail" ? O.some(c.value) : O.none))
  )

/**
 * Returns if the cause has a failure in it
 */
export const failed = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    failureOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export const failureOrCause = <E>(cause: Cause<E>): E.Either<E, Cause<never>> =>
  pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export const failures = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    foldLeft<readonly E[]>([])((a, c) =>
      c._tag === "Fail" ? O.some([...a, c.value]) : O.none
    )
  )

/**
 * Filter out all `Die` causes according to the specified function,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export const filterSomeDefects = (f: (_: unknown) => boolean) => <E>(
  cause: Cause<E>
): O.Option<Cause<E>> => {
  switch (cause._tag) {
    case "Empty": {
      return O.none
    }
    case "Interrupt": {
      return O.some(cause)
    }
    case "Fail": {
      return O.some(cause)
    }
    case "Die": {
      return f(cause.value) ? O.some(cause) : O.none
    }
    case "Both": {
      const left = filterSomeDefects(f)(cause.left)
      const right = filterSomeDefects(f)(cause.right)

      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(Both(left.value, right.value))
      } else if (left._tag === "Some") {
        return left
      } else if (right._tag === "Some") {
        return right
      } else {
        return O.none
      }
    }
    case "Then": {
      const left = filterSomeDefects(f)(cause.left)
      const right = filterSomeDefects(f)(cause.right)

      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(Then(left.value, right.value))
      } else if (left._tag === "Some") {
        return left
      } else if (right._tag === "Some") {
        return right
      } else {
        return O.none
      }
    }
  }
}

/**
 * Finds the first result matching f
 */
export const find = <Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): ((cause: Cause<E>) => O.Option<Z>) => {
  return (cause) => {
    const apply = f(cause)

    if (apply._tag === "Some") {
      return apply
    }

    switch (cause._tag) {
      case "Then": {
        const isLeft = find(f)(cause.left)
        if (isLeft._tag === "Some") {
          return isLeft
        } else {
          return find(f)(cause.right)
        }
      }
      case "Both": {
        const isLeft = find(f)(cause.left)
        if (isLeft._tag === "Some") {
          return isLeft
        } else {
          return find(f)(cause.right)
        }
      }
      default: {
        return apply
      }
    }
  }
}

/**
 * Equivalent to chain(identity)
 */
export const flatten = <E>(cause: Cause<Cause<E>>): Cause<E> =>
  pipe(cause, chain(identity))

/**
 * Folds over a cause
 */
export const fold = <E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z
) => (cause: Cause<E>): Z => {
  switch (cause._tag) {
    case "Empty": {
      return empty()
    }
    case "Fail": {
      return failCase(cause.value)
    }
    case "Die": {
      return dieCase(cause.value)
    }
    case "Interrupt": {
      return interruptCase(cause.fiberId)
    }
    case "Both": {
      return bothCase(
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.left),
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.right)
      )
    }
    case "Then": {
      return thenCase(
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.left),
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.right)
      )
    }
  }
}

/**
 * Accumulates a state over a Cause
 */
export const foldLeft = <Z>(z: Z) => <E>(
  f: (z: Z, cause: Cause<E>) => O.Option<Z>
): ((cause: Cause<E>) => Z) => {
  return (cause) => {
    const apply = O.getOrElse_(f(z, cause), () => z)

    switch (cause._tag) {
      case "Then": {
        return foldLeft(foldLeft(apply)(f)(cause.left))(f)(cause.right)
      }
      case "Both": {
        return foldLeft(foldLeft(apply)(f)(cause.left))(f)(cause.right)
      }
      default: {
        return apply
      }
    }
  }
}

/**
 * Returns if the cause contains an interruption in it
 */
export const interrupted = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export const interruptOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Interrupt" ? O.some(c.fiberId) : O.none))
  )

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export const interruptedOnly = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Die" || c._tag === "Fail" ? O.some(false) : O.none)),
    O.getOrElse(() => true)
  )

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export const interruptors = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    foldLeft<Set<FiberID>>(new Set())((s, c) =>
      c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none
    )
  )

/**
 * Determines if the `Cause` is empty.
 */
export const isEmpty = <E>(cause: Cause<E>) =>
  equalsCause(cause, Empty) ||
  pipe(
    cause,
    foldLeft(true)((acc, c) => {
      switch (c._tag) {
        case "Empty": {
          return O.some(acc)
        }
        case "Die": {
          return O.some(false)
        }
        case "Fail": {
          return O.some(false)
        }
        case "Interrupt": {
          return O.some(false)
        }
        default: {
          return O.none
        }
      }
    })
  )

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export const keepDefects = <E>(cause: Cause<E>): O.Option<Cause<never>> => {
  switch (cause._tag) {
    case "Empty": {
      return O.none
    }
    case "Fail": {
      return O.none
    }
    case "Interrupt": {
      return O.none
    }
    case "Die": {
      return O.some(cause)
    }
    case "Then": {
      const lefts = keepDefects(cause.left)
      const rights = keepDefects(cause.right)

      if (lefts._tag === "Some" && rights._tag === "Some") {
        return O.some(Then(lefts.value, rights.value))
      } else if (lefts._tag === "Some") {
        return lefts
      } else if (rights._tag === "Some") {
        return rights
      } else {
        return O.none
      }
    }
    case "Both": {
      const lefts = keepDefects(cause.left)
      const rights = keepDefects(cause.right)

      if (lefts._tag === "Some" && rights._tag === "Some") {
        return O.some(Both(lefts.value, rights.value))
      } else if (lefts._tag === "Some") {
        return lefts
      } else if (rights._tag === "Some") {
        return rights
      } else {
        return O.none
      }
    }
  }
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export const sequenceCauseEither = <E, A>(
  c: Cause<E.Either<E, A>>
): E.Either<Cause<E>, A> => {
  switch (c._tag) {
    case "Empty": {
      return E.left(Empty)
    }
    case "Interrupt": {
      return E.left(c)
    }
    case "Fail": {
      return c.value._tag === "Left"
        ? E.left(Fail(c.value.left))
        : E.right(c.value.right)
    }
    case "Die": {
      return E.left(c)
    }
    case "Then": {
      const [l, r] = [sequenceCauseEither(c.left), sequenceCauseEither(c.right)]

      if (l._tag === "Left") {
        if (r._tag === "Right") {
          return E.right(r.right)
        } else {
          return E.left(Then(l.left, r.left))
        }
      } else {
        return E.right(l.right)
      }
    }
    case "Both": {
      const [l, r] = [sequenceCauseEither(c.left), sequenceCauseEither(c.right)]

      if (l._tag === "Left") {
        if (r._tag === "Right") {
          return E.right(r.right)
        } else {
          return E.left(Both(l.left, r.left))
        }
      } else {
        return E.right(l.right)
      }
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export const sequenceCauseOption = <E>(c: Cause<O.Option<E>>): O.Option<Cause<E>> => {
  switch (c._tag) {
    case "Empty": {
      return O.some(Empty)
    }
    case "Interrupt": {
      return O.some(c)
    }
    case "Fail": {
      return O.map_(c.value, Fail)
    }
    case "Die": {
      return O.some(c)
    }
    case "Then": {
      const [l, r] = [sequenceCauseOption(c.left), sequenceCauseOption(c.right)]

      if (l._tag === "Some" && r._tag === "Some") {
        return O.some(Then(l.value, r.value))
      } else if (l._tag === "Some") {
        return O.some(l.value)
      } else if (r._tag === "Some") {
        return O.some(r.value)
      } else {
        return O.none
      }
    }
    case "Both": {
      const [l, r] = [sequenceCauseOption(c.left), sequenceCauseOption(c.right)]

      if (l._tag === "Some" && r._tag === "Some") {
        return O.some(Both(l.value, r.value))
      } else if (l._tag === "Some") {
        return O.some(l.value)
      } else if (r._tag === "Some") {
        return O.some(r.value)
      } else {
        return O.none
      }
    }
  }
}

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export const squash = <E>(f: (e: E) => unknown) => (cause: Cause<E>): unknown =>
  pipe(
    cause,
    failureOption,
    O.map(f),
    O.alt(() =>
      interrupted(cause)
        ? O.some<unknown>(
            new InterruptedException(
              "Interrupted by fibers: " +
                Array.from(interruptors(cause))
                  .map((_) => _.seqNumber.toString())
                  .map((_) => "#" + _)
                  .join(", ")
            )
          )
        : O.none
    ),
    O.alt(() => A.head(defects(cause))),
    O.getOrElse(() => new InterruptedException())
  )

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripFailures = <E>(cause: Cause<E>): Cause<never> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return Empty
    }
    case "Interrupt": {
      return cause
    }
    case "Die": {
      return cause
    }
    case "Both": {
      return Both(stripFailures(cause.left), stripFailures(cause.right))
    }
    case "Then": {
      return Then(stripFailures(cause.left), stripFailures(cause.right))
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripInterrupts = <E>(cause: Cause<E>): Cause<E> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return cause
    }
    case "Interrupt": {
      return Empty
    }
    case "Die": {
      return cause
    }
    case "Both": {
      return Both(stripInterrupts(cause.left), stripInterrupts(cause.right))
    }
    case "Then": {
      return Then(stripInterrupts(cause.left), stripInterrupts(cause.right))
    }
  }
}
