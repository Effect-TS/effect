import * as A from "../Array"
import * as E from "../Either"
import type { FiberID } from "../Fiber/id"
import { identity, pipe } from "../Function"
import * as O from "../Option"
import * as S from "../Sync"
import type { Cause } from "./cause"
import { Both, Empty, Fail, Then } from "./cause"
import { equalsCause } from "./eq"
import { InterruptedException } from "./errors"

export { Both, Cause, Empty, Fail, Then, Die, Interrupt } from "./cause"

/**
 * Applicative's ap
 */
export function ap<A>(fa: Cause<A>): <B>(fab: Cause<(a: A) => B>) => Cause<B> {
  return chain((f) => pipe(fa, map(f)))
}

/**
 * Substitute the E in the cause
 */
export function as<E1>(e: E1) {
  return map(() => e)
}

/**
 * Builds a Cause depending on the result of another
 */
export function chain<E, E1>(f: (_: E) => Cause<E1>) {
  return (cause: Cause<E>): Cause<E1> => {
    return S.run(chainSafe(f)(cause))
  }
}

/**
 * Builds a Cause depending on the result of another
 */
export function chainSafe<E, E1>(f: (_: E) => Cause<E1>) {
  return (cause: Cause<E>): S.UIO<Cause<E1>> =>
    S.gen(function* (_) {
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
          return Then(
            yield* _(chainSafe(f)(cause.left)),
            yield* _(chainSafe(f)(cause.right))
          )
        }
        case "Both": {
          return Both(
            yield* _(chainSafe(f)(cause.left)),
            yield* _(chainSafe(f)(cause.right))
          )
        }
      }
    })
}

/**
 * Equivalent to chain((a) => Fail(f(a)))
 */
export function map<E, E1>(f: (e: E) => E1) {
  return chain((e: E) => Fail(f(e)))
}

/**
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>) {
  return (cause: Cause<E>) =>
    equalsCause(that, cause) ||
    pipe(
      cause,
      foldLeft(false)((_, c) => (equalsCause(that, c) ? O.some(true) : O.none))
    )
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(cause: Cause<E>): readonly unknown[] {
  return pipe(
    cause,
    foldLeft<readonly unknown[]>([])((a, c) =>
      c._tag === "Die" ? O.some([...a, c.value]) : O.none
    )
  )
}

/**
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Die" ? O.some(c.value) : O.none))
  )
}

/**
 * Returns if a cause contains a defect
 */
export function died<E>(cause: Cause<E>) {
  return pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Fail" ? O.some(c.value) : O.none))
  )
}

/**
 * Returns if the cause has a failure in it
 */
export function failed<E>(cause: Cause<E>) {
  return pipe(
    cause,
    failureOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export function failureOrCause<E>(cause: Cause<E>): E.Either<E, Cause<never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>) {
  return pipe(
    cause,
    foldLeft<readonly E[]>([])((a, c) =>
      c._tag === "Fail" ? O.some([...a, c.value]) : O.none
    )
  )
}

/**
 * Filter out all `Die` causes according to the specified function,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function filterSomeDefects(f: (_: unknown) => boolean) {
  return <E>(cause: Cause<E>): O.Option<Cause<E>> => {
    return S.run(filterSomeDefectsSafe(f)(cause))
  }
}

/**
 * Filter out all `Die` causes according to the specified function,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function filterSomeDefectsSafe(f: (_: unknown) => boolean) {
  return <E>(cause: Cause<E>): S.UIO<O.Option<Cause<E>>> =>
    S.gen(function* (_) {
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
          const left = yield* _(filterSomeDefectsSafe(f)(cause.left))
          const right = yield* _(filterSomeDefectsSafe(f)(cause.right))

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
          const left = yield* _(filterSomeDefectsSafe(f)(cause.left))
          const right = yield* _(filterSomeDefectsSafe(f)(cause.right))

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
    })
}

/**
 * Finds the first result matching f
 */
export function find<Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): (cause: Cause<E>) => O.Option<Z> {
  return (cause) => S.run(findSafe(f)(cause))
}

/**
 * Finds the first result matching f
 */
export function findSafe<Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): (cause: Cause<E>) => S.UIO<O.Option<Z>> {
  return (cause) =>
    S.gen(function* (_) {
      const apply = f(cause)

      if (apply._tag === "Some") {
        return apply
      }

      switch (cause._tag) {
        case "Then": {
          const isLeft = yield* _(findSafe(f)(cause.left))
          if (isLeft._tag === "Some") {
            return isLeft
          } else {
            return yield* _(findSafe(f)(cause.right))
          }
        }
        case "Both": {
          const isLeft = yield* _(findSafe(f)(cause.left))
          if (isLeft._tag === "Some") {
            return isLeft
          } else {
            return yield* _(findSafe(f)(cause.right))
          }
        }
        default: {
          return apply
        }
      }
    })
}

/**
 * Equivalent to chain(identity)
 */
export const flatten = <E>(cause: Cause<Cause<E>>): Cause<E> =>
  pipe(cause, chain(identity))

/**
 * Folds over a cause
 */
export function fold<E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z
) {
  return (cause: Cause<E>): Z =>
    S.run(foldSafe(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause))
}

/**
 * Folds over a cause
 */
export function foldSafe<E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z
) {
  return (cause: Cause<E>): S.UIO<Z> =>
    S.gen(function* (_) {
      yield* _(S.unit)
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
            yield* _(
              foldSafe(
                empty,
                failCase,
                dieCase,
                interruptCase,
                thenCase,
                bothCase
              )(cause.left)
            ),
            yield* _(
              foldSafe(
                empty,
                failCase,
                dieCase,
                interruptCase,
                thenCase,
                bothCase
              )(cause.right)
            )
          )
        }
        case "Then": {
          return thenCase(
            yield* _(
              foldSafe(
                empty,
                failCase,
                dieCase,
                interruptCase,
                thenCase,
                bothCase
              )(cause.left)
            ),
            yield* _(
              foldSafe(
                empty,
                failCase,
                dieCase,
                interruptCase,
                thenCase,
                bothCase
              )(cause.right)
            )
          )
        }
      }
    })
}

/**
 * Accumulates a state over a Cause
 */
export function foldLeft<Z>(z: Z) {
  return <E>(f: (z: Z, cause: Cause<E>) => O.Option<Z>): ((cause: Cause<E>) => Z) => {
    return (cause) => S.run(foldLeftSafe(z)(f)(cause))
  }
}

/**
 * Accumulates a state over a Cause
 */
export function foldLeftSafe<Z>(z: Z) {
  return <E>(
    f: (z: Z, cause: Cause<E>) => O.Option<Z>
  ): ((cause: Cause<E>) => S.UIO<Z>) => {
    return (cause) =>
      S.gen(function* (_) {
        const apply = O.getOrElse_(f(z, cause), () => z)

        switch (cause._tag) {
          case "Then": {
            return yield* _(
              foldLeftSafe(yield* _(foldLeftSafe(apply)(f)(cause.left)))(f)(cause.right)
            )
          }
          case "Both": {
            return yield* _(
              foldLeftSafe(yield* _(foldLeftSafe(apply)(f)(cause.left)))(f)(cause.right)
            )
          }
          default: {
            return apply
          }
        }
      })
  }
}

/**
 * Returns if the cause contains an interruption in it
 */
export function interrupted<E>(cause: Cause<E>) {
  return pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Interrupt" ? O.some(c.fiberId) : O.none))
  )
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Die" || c._tag === "Fail" ? O.some(false) : O.none)),
    O.getOrElse(() => true)
  )
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>) {
  return pipe(
    cause,
    foldLeft<Set<FiberID>>(new Set())((s, c) =>
      c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none
    )
  )
}

/**
 * Determines if the `Cause` is empty.
 */
export function isEmpty<E>(cause: Cause<E>) {
  return (
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
  )
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefectsSafe<E>(cause: Cause<E>): S.UIO<O.Option<Cause<never>>> {
  return S.gen(function* (_) {
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
        const lefts = yield* _(keepDefectsSafe(cause.left))
        const rights = yield* _(keepDefectsSafe(cause.right))

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
        const lefts = yield* _(keepDefectsSafe(cause.left))
        const rights = yield* _(keepDefectsSafe(cause.right))

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
  })
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return S.run(keepDefectsSafe(cause))
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(
  c: Cause<E.Either<E, A>>
): E.Either<Cause<E>, A> {
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
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEitherSafe<E, A>(
  c: Cause<E.Either<E, A>>
): S.UIO<E.Either<Cause<E>, A>> {
  return S.gen(function* (_) {
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
        const [l, r] = [
          yield* _(sequenceCauseEitherSafe(c.left)),
          yield* _(sequenceCauseEitherSafe(c.right))
        ]

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
        const [l, r] = [
          yield* _(sequenceCauseEitherSafe(c.left)),
          yield* _(sequenceCauseEitherSafe(c.right))
        ]

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
  })
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export function sequenceCauseOptionSafe<E>(
  c: Cause<O.Option<E>>
): S.UIO<O.Option<Cause<E>>> {
  return S.gen(function* (_) {
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
        const [l, r] = [
          yield* _(sequenceCauseOptionSafe(c.left)),
          yield* _(sequenceCauseOptionSafe(c.right))
        ]

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
        const [l, r] = [
          yield* _(sequenceCauseOptionSafe(c.left)),
          yield* _(sequenceCauseOptionSafe(c.right))
        ]

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
  })
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export function sequenceCauseOption<E>(c: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return S.run(sequenceCauseOptionSafe(c))
}

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export function squash<E>(f: (e: E) => unknown) {
  return (cause: Cause<E>): unknown =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      (o) =>
        o._tag === "Some"
          ? o
          : interrupted(cause)
          ? O.some<unknown>(
              new InterruptedException(
                "Interrupted by fibers: " +
                  Array.from(interruptors(cause))
                    .map((_) => _.seqNumber.toString())
                    .map((_) => "#" + _)
                    .join(", ")
              )
            )
          : O.none,
      (o) => (o._tag === "Some" ? o : A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException())
    )
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
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
export function stripFailuresSafe<E>(cause: Cause<E>): S.UIO<Cause<never>> {
  return S.gen(function* (_) {
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
        return Both(
          yield* _(stripFailuresSafe(cause.left)),
          yield* _(stripFailuresSafe(cause.right))
        )
      }
      case "Then": {
        return Then(
          yield* _(stripFailuresSafe(cause.left)),
          yield* _(stripFailuresSafe(cause.right))
        )
      }
    }
  })
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
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

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripInterruptsSafe<E>(cause: Cause<E>): S.UIO<Cause<E>> {
  return S.gen(function* (_) {
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
        return Both(
          yield* _(stripInterruptsSafe(cause.left)),
          yield* _(stripInterruptsSafe(cause.right))
        )
      }
      case "Then": {
        return Then(
          yield* _(stripInterruptsSafe(cause.left)),
          yield* _(stripInterruptsSafe(cause.right))
        )
      }
    }
  })
}

export function isCause(u: unknown): u is Cause<unknown> {
  return (
    typeof u === "object" &&
    u !== null &&
    "_tag" in u &&
    ["Empty", "Fail", "Die", "Interrupt", "Then", "Both"].includes(u["_tag"])
  )
}
