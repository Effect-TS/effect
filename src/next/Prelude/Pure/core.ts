/* eslint-disable prefer-const */
import * as E from "../../../Either"
import { Stack } from "../../Fiber/context"

/**
 * `XPure[S1, S2, R, E, A]` is a purely functional description of a computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `XPure` can be used to model a variety of effects
 * including context, state, and failure.
 */
export abstract class XPure<S1, S2, R, E, A> {
  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
}

function concrete<S1, S2, R, E, A>(
  _: XPure<S1, S2, R, E, A>
): Concrete<S1, S2, R, E, A> {
  return _ as any
}

class Succeed<A> extends XPure<unknown, never, unknown, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly a: A) {
    super()
  }
}

class Fail<E> extends XPure<unknown, never, unknown, E, never> {
  readonly _tag = "Fail"

  constructor(readonly e: E) {
    super()
  }
}

class Modify<S1, S2, E, A> extends XPure<S1, S2, unknown, E, A> {
  readonly _tag = "Modify"

  constructor(readonly run: (s1: S1) => readonly [S2, A]) {
    super()
  }
}

class FlatMap<S1, S2, S3, R, R1, E, E1, A, B> extends XPure<S1, S3, R & R1, E1 | E, B> {
  readonly _tag = "FlatMap"

  constructor(
    readonly value: XPure<S1, S2, R, E, A>,
    readonly cont: (a: A) => XPure<S2, S3, R1, E1, B>
  ) {
    super()
  }
}

class Fold<S1, S2, S3, R, E1, E2, A, B> extends XPure<S1, S3, R, E2, B> {
  readonly _tag = "Fold"

  constructor(
    readonly value: XPure<S1, S2, R, E1, A>,
    readonly failure: (e: E1) => XPure<S1, S3, R, E2, B>,
    readonly success: (a: A) => XPure<S1, S3, R, E2, B>
  ) {
    super()
  }
}

class Access<S1, S2, R, E, A> extends XPure<S1, S2, R, E, A> {
  readonly _tag = "Access"

  constructor(readonly access: (r: R) => XPure<S1, S2, R, E, A>) {
    super()
  }
}

class Provide<S1, S2, R, E, A> extends XPure<S1, S2, unknown, E, A> {
  readonly _tag = "Provide"

  constructor(readonly r: R, readonly cont: XPure<S1, S2, R, E, A>) {
    super()
  }
}

type Concrete<S1, S2, R, E, A> =
  | Succeed<A>
  | Fail<E>
  | Modify<S1, S2, E, A>
  | FlatMap<S1, unknown, S2, R, R, E, E, unknown, A>
  | Fold<S1, unknown, S2, R, unknown, E, unknown, A>
  | Access<S1, S2, R, E, A>
  | Provide<S1, S2, R, E, A>

class FoldFrame {
  readonly _tag = "FoldFrame"
  constructor(
    readonly failure: (e: any) => XPure<any, any, any, any, any>,
    readonly apply: (e: any) => XPure<any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _tag = "ApplyFrame"
  constructor(readonly apply: (e: any) => XPure<any, any, any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runEitherState_<S1, S2, E, A>(
  self: XPure<S1, S2, unknown, E, A>,
  s: S1
): E.Either<E, readonly [S2, A]> {
  let stack: Stack<Frame> | undefined = undefined
  let s0 = s as any
  let a = null
  let r = null
  let failed = false
  let curXPure = self as XPure<any, any, any, any, any> | undefined

  function pop() {
    const nextInstr = stack
    if (nextInstr) {
      stack = stack?.previous
    }
    return nextInstr?.value
  }

  function push(cont: Frame) {
    stack = new Stack(cont, stack)
  }

  function findNextErrorHandler() {
    let unwinding = true
    while (unwinding) {
      const nextInstr = pop()

      if (nextInstr == null) {
        unwinding = false
      } else {
        if (nextInstr._tag === "FoldFrame") {
          unwinding = false
          push(new ApplyFrame(nextInstr.failure))
        }
      }
    }
  }

  while (curXPure != null) {
    const xp = concrete(curXPure)

    switch (xp._tag) {
      case "FlatMap": {
        const nested = concrete(xp.value)
        const continuation = xp.cont

        switch (nested._tag) {
          case "Succeed": {
            curXPure = continuation(nested.a)
            break
          }
          case "Modify": {
            const updated = nested.run(s0)

            s0 = updated[0]
            a = updated[1]

            curXPure = continuation(a)
            break
          }
          default: {
            curXPure = nested
            push(new ApplyFrame(continuation))
          }
        }

        break
      }
      case "Succeed": {
        a = xp.a
        const nextInstr = pop()
        if (nextInstr) {
          curXPure = nextInstr.apply(a)
        } else {
          curXPure = undefined
        }
        break
      }
      case "Fail": {
        findNextErrorHandler()
        const nextInst = pop()
        if (nextInst) {
          curXPure = nextInst.apply(xp.e)
        } else {
          failed = true
          a = xp.e
          curXPure = undefined
        }
        break
      }
      case "Fold": {
        curXPure = xp.value
        push(new FoldFrame(xp.failure, xp.success))
        break
      }
      case "Access": {
        curXPure = xp.access(r)
        break
      }
      case "Provide": {
        r = xp.r
        curXPure = xp.cont
        break
      }
      case "Modify": {
        const updated = xp.run(s0)
        s0 = updated[0]
        a = updated[1]
        const nextInst = pop()
        if (nextInst) {
          curXPure = nextInst.apply(a)
        } else {
          curXPure = undefined
        }
        break
      }
    }
  }

  if (failed) {
    return E.left(a)
  }

  return E.right([s0, a])
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runEitherState<S1>(
  s: S1
): <S2, E, A>(self: XPure<S1, S2, unknown, E, A>) => E.Either<E, readonly [S2, A]> {
  return (self) => runEitherState_(self, s)
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runEither<E, A>(
  self: XPure<unknown, unknown, unknown, E, A>
): E.Either<E, A> {
  return E.map_(runEitherState_(self, {}), ([_, x]) => x)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain<A, S2, S3, R1, E1, B>(f: (a: A) => XPure<S2, S3, R1, E1, B>) {
  return <S1, R, E>(self: XPure<S1, S2, R, E, A>): XPure<S1, S3, R & R1, E | E1, B> =>
    new FlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain_<S1, R, E, A, S2, S3, R1, E1, B>(
  self: XPure<S1, S2, R, E, A>,
  f: (a: A) => XPure<S2, S3, R1, E1, B>
): XPure<S1, S3, R & R1, E | E1, B> {
  return new FlatMap(self, f)
}

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export function succeed<A, S, S1 = S>(a: A): XPure<S, S1, unknown, never, A> {
  return new Succeed(a)
}

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export function fail<E, S, S1 = S>(a: E): XPure<S, S1, unknown, E, never> {
  return new Fail(a)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function map_<S1, R, E, A, S2, B>(self: XPure<S1, S2, R, E, A>, f: (a: A) => B) {
  return chain_(self, (a) => succeed(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function map<A, B>(f: (a: A) => B) {
  return <S1, S2, R, E>(self: XPure<S1, S2, R, E, A>) =>
    chain_(self, (a) => succeed(f(a)))
}
