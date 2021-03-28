// tracing: off

import "../../Operator"

import { RuntimeError } from "../../Cause"
import * as T from "../../Effect"
import * as E from "../../Either"
import { identity } from "../../Function"
import * as O from "../../Option"
import { AtomicBoolean } from "../../Support/AtomicBoolean"
import { Resumable, STM, tryCommit, tryCommitAsync } from "./Journal"
import * as TExit from "./TExit"
import { DoneTypeId, SuspendTypeId } from "./TryCommit"
import { makeTxnId } from "./TxnId"

export { STM, Resumable } from "./Journal"

export const MaxFrames = 200

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 */
export const retry: STM<unknown, never, never> = new STM(() => TExit.retry)

/**
 * Returns an `STM` effect that succeeds with `Unit`.
 */
export const unit = succeed<void>(undefined)

/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 */
export function absolve<R, E, E1, A>(z: STM<R, E, E.Either<E1, A>>): STM<R, E | E1, A> {
  return chain_(z, fromEither)
}

/**
 * Like chain but ignores the input
 */
export function andThen_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  that: STM<R1, E1, B>
): STM<R1 & R, E | E1, B> {
  return chain_(self, () => that)
}

/**
 * Like chain but ignores the input
 *
 * @dataFirst andThen_
 */
export function andThen<R1, E1, B>(
  that: STM<R1, E1, B>
): <R, E, A>(self: STM<R, E, A>) => STM<R1 & R, E | E1, B> {
  return (self) => andThen_(self, that)
}

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as_<R, E, A, B>(self: STM<R, E, A>, b: B): STM<R, E, B> {
  return map_(self, () => b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<A, B>(b: B): <R, E>(self: STM<R, E, A>) => STM<R, E, B> {
  return (self) => as_(self, b)
}

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(self: STM<R, E, A>): STM<R, E, O.Option<A>> {
  return map_(self, O.some)
}

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(self: STM<R, E, A>): STM<R, O.Option<E>, A> {
  return mapError_(self, O.some)
}

/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, B>(
  self: STM<R, E, A>,
  g: (e: E) => E1,
  f: (a: A) => B
): STM<R, E1, B> {
  return foldM_(
    self,
    (e) => fail(g(e)),
    (a) => succeed(f(a))
  )
}

/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @dataFirst bimap_
 */
export function bimap<R, E, A, E1, B>(
  g: (e: E) => E1,
  f: (a: A) => B
): (self: STM<R, E, A>) => STM<R, E1, B> {
  return (self) => bimap_(self, g, f)
}

/**
 * Atomically performs a batch of operations in a single transaction.
 */
export function atomically<R, E, A>(stm: STM<R, E, A>) {
  return T.accessM((r: R) =>
    T.suspend((_, fiberId) => {
      const v = tryCommit(fiberId, stm, r)

      switch (v._typeId) {
        case DoneTypeId: {
          return v.io
        }
        case SuspendTypeId: {
          const txnId = makeTxnId()
          const done = new AtomicBoolean(false)
          const interrupt = T.effectTotal(() => done.set(true))
          const io = T.effectAsync(
            tryCommitAsync(v.journal, fiberId, stm, txnId, done, r)
          )
          return T.ensuring_(io, interrupt)
        }
      }
    })
  )
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R1, E1, B>
): STM<R1 & R, E1, A | B> {
  return foldM_(self, f, succeed)
}

/**
 * Recovers from all errors.
 *
 * @dataFirst catchAll_
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => STM<R1, E1, B>
): <R, A>(self: STM<R, E, A>) => STM<R1 & R, E1, A | B> {
  return (self) => catchAll_(self, f)
}

/**
 * Recovers from specified error.
 *
 * @dataFirst catch_
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>,
  __trace?: string
) {
  return <R, A>(
    self: STM<R, E, A>
  ): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    catchAll_(self, (e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return fail(e as any)
    })
}

/**
 * Recovers from specified error.
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  self: STM<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return catchAll_(self, (e) => {
    if (tag in e && e[tag] === k) {
      return f(e as any)
    }
    return fail(e as any)
  })
}

/**
 * Recovers from specified error.
 *
 * @dataFirst catchTag_
 */
export function catchTag<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R1,
  E1,
  A1
>(k: K, f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>, __trace?: string) {
  return <R, A>(
    self: STM<R, E, A>
  ): STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> => catchTag_(self, k, f)
}

/**
 * Recovers from specified error.
 */
export function catchTag_<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R,
  A,
  R1,
  E1,
  A1
>(
  self: STM<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
): STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catchAll_(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return fail(e as any)
  })
}

export { _catch as catch }

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => O.Option<STM<R1, E1, B>>
): STM<R1 & R, E | E1, A | B> {
  return catchAll_(
    self,
    (e): STM<R1, E | E1, A | B> => O.fold_(f(e), () => fail(e), identity)
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchSome_
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => O.Option<STM<R1, E1, B>>
): <R, A>(self: STM<R, E, A>) => STM<R1 & R, E | E1, A | B> {
  return (self) => catchSome_(self, f)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailM_<R, E, E1, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return chain_(fa, (a): STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => fail(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailM_
 */
export function continueOrFailM<E1, A, R2, E2, A2>(
  e: E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailM_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, E1, A, A2>(
  fa: STM<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailM_(fa, e, (x) => O.map_(pf(x), succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFail_
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFail_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailML_<R, E, E1, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return chain_(fa, (a): STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => failL(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailML_
 */
export function continueOrFailML<E1, A, R2, E2, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailML_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFailL_<R, E, E1, A, A2>(
  fa: STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailML_(fa, e, (x) => O.map_(pf(x), succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFailL_
 */
export function continueOrFailL<E1, A, A2>(e: () => E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailL_(fa, e, pf)
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 */
export function chain_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R, E | E1, B> {
  return continueWithM_(
    self,
    (_): STM<R1, E | E1, B> => {
      switch (_._typeId) {
        case TExit.SucceedTypeId: {
          return f(_.value)
        }
        case TExit.FailTypeId: {
          return fail(_.value)
        }
        case TExit.RetryTypeId: {
          return retry
        }
      }
    }
  )
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @dataFirst chain_
 */
export function chain<A, R1, E1, B>(
  f: (a: A) => STM<R1, E1, B>
): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, B> {
  return (self) => chain_(self, f)
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function checkL(predicate: () => boolean) {
  return suspend(() => (predicate() ? unit : retry))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function check(predicate: boolean) {
  return checkL(() => predicate)
}

/**
 * Low-level continuation to be used internally
 */
export function continueWithM_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  continueM: (_: TExit.TExit<E, A>) => STM<R1, E1, B>
): STM<R1 & R, E1, B> {
  return new STM((journal, fiberId, stackSize, r) => {
    const framesCount = stackSize.incrementAndGet()

    if (framesCount > MaxFrames) {
      throw new Resumable(provideAll_(self, r), [(_) => provideAll_(continueM(_), r)])
    } else {
      let continued: STM<R1, E1, B>
      try {
        continued = continueM(self.exec(journal, fiberId, stackSize, r))
      } catch (e) {
        if (e instanceof Resumable) {
          e.stack.push((_) => provideAll_(continueM(_), r))
        }
        throw e
      }
      return continued.exec(journal, fiberId, stackSize, r)
    }
  })
}

/**
 * Kills the fiber running the effect.
 */
export function die(u: unknown): STM<unknown, never, never> {
  return succeedL(() => {
    throw u
  })
}

/**
 * Kills the fiber running the effect.
 */
export function dieL(u: () => unknown): STM<unknown, never, never> {
  return succeedL(() => {
    throw u()
  })
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessage(message: string): STM<unknown, never, never> {
  return succeedL(() => {
    throw new RuntimeError(message)
  })
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessageL(message: () => string): STM<unknown, never, never> {
  return succeedL(() => {
    throw new RuntimeError(message())
  })
}

/**
 * Returns a value that models failure in the transaction.
 */
export function fail<E>(e: E): STM<unknown, E, never> {
  return new STM(() => TExit.fail(e))
}

/**
 * Returns a value that models failure in the transaction.
 */
export function failL<E>(e: () => E): STM<unknown, E, never> {
  return new STM(() => TExit.fail(e()))
}

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 */
export function fold_<R, E, A, B, C>(
  self: STM<R, E, A>,
  g: (e: E) => C,
  f: (a: A) => B
): STM<R, never, B | C> {
  return foldM_(
    self,
    (e) => succeed(g(e)),
    (a) => succeed(f(a))
  )
}

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 *
 * @dataFIrst fold_
 */
export function fold<E, A, B, C>(
  g: (e: E) => C,
  f: (a: A) => B
): <R>(self: STM<R, E, A>) => STM<R, never, B | C> {
  return (self) => fold_(self, g, f)
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: STM<R, E, A>,
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R2 & R, E1 | E2, B | C> {
  return continueWithM_(
    self,
    (_): STM<R1 & R2, E1 | E2, B | C> => {
      switch (_._typeId) {
        case TExit.SucceedTypeId: {
          return f(_.value)
        }
        case TExit.FailTypeId: {
          return g(_.value)
        }
        case TExit.RetryTypeId: {
          return retry
        }
      }
    }
  )
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 *
 * @dataFirst foldM_
 */
export function foldM<E, A, R1, E1, B, R2, E2, C>(
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): <R>(self: STM<R, E, A>) => STM<R1 & R2 & R, E1 | E2, B | C> {
  return (self) => foldM_(self, g, f)
}

/**
 * Flattens out a nested `STM` effect.
 */
export function flatten<R, E, R1, E1, B>(
  self: STM<R, E, STM<R1, E1, B>>
): STM<R1 & R, E | E1, B> {
  return chain_(self, identity)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns a transactional effect that produces a new `ReadonlyArray<B>`.
 */
export function forEach_<A, R, E, B>(
  it: Iterable<A>,
  f: (a: A) => STM<R, E, B>
): STM<R, E, readonly B[]> {
  return suspend(() => {
    let stm = succeed([]) as STM<R, E, B[]>

    for (const a of it) {
      stm = zipWith_(stm, f(a), (acc, b) => {
        acc.push(b)
        return acc
      })
    }

    return stm
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns a transactional effect that produces a new `ReadonlyArray<B>`.
 *
 * @dataFirst forEach_
 */
export function forEach<A, R, E, B>(
  f: (a: A) => STM<R, E, B>
): (it: Iterable<A>) => STM<R, E, readonly B[]> {
  return (self) => forEach_(self, f)
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEitherL<E, A>(e: () => E.Either<E, A>): STM<unknown, E, A> {
  return suspend(() => {
    return E.fold_(e(), fail, succeed)
  })
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEither<E, A>(e: E.Either<E, A>): STM<unknown, E, A> {
  return E.fold_(e, fail, succeed)
}

/**
 * Maps the value produced by the effect.
 */
export function map_<R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B> {
  return continueWithM_(self, (_) => {
    switch (_._typeId) {
      case TExit.SucceedTypeId: {
        return succeed(f(_.value))
      }
      case TExit.FailTypeId: {
        return fail(_.value)
      }
      case TExit.RetryTypeId: {
        return retry
      }
    }
  })
}

/**
 * Maps the value produced by the effect.
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B> {
  return (self) => map_(self, f)
}

/**
 * Maps from one error type to another.
 */
export function mapError_<R, E, A, E1>(
  self: STM<R, E, A>,
  f: (a: E) => E1
): STM<R, E1, A> {
  return continueWithM_(self, (_) => {
    switch (_._typeId) {
      case TExit.SucceedTypeId: {
        return succeed(_.value)
      }
      case TExit.FailTypeId: {
        return fail(f(_.value))
      }
      case TExit.RetryTypeId: {
        return retry
      }
    }
  })
}

/**
 * Maps from one error type to another.
 *
 * @dataFirst mapError_
 */
export function mapError<E, E1>(
  f: (a: E) => E1
): <R, A>(self: STM<R, E, A>) => STM<R, E1, A> {
  return (self) => mapError_(self, f)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(self: STM<R, E, A>, r: R): STM<unknown, E, A> {
  return provideSome_(self, () => r)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @dataFirst provideAll_
 */
export function provideAll<R>(r: R): <E, A>(self: STM<R, E, A>) => STM<unknown, E, A> {
  return (self) => provideAll_(self, r)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R, E, A, R0>(
  self: STM<R, E, A>,
  f: (r: R0) => R
): STM<R0, E, A> {
  return new STM((journal, fiberId, stackSize, r0) => {
    const framesCount = stackSize.incrementAndGet()

    if (framesCount > MaxFrames) {
      throw new Resumable(
        new STM((journal, fiberId, stackSize, _) =>
          self.exec(journal, fiberId, stackSize, f(r0))
        ),
        []
      )
    } else {
      return self.exec(journal, fiberId, stackSize, f(r0))
    }
  })
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @dataFirst provideSome_
 */
export function provideSome<R, R0>(
  f: (r: R0) => R
): <E, A>(self: STM<R, E, A>) => STM<R0, E, A> {
  return (self) => provideSome_(self, f)
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeed<A>(a: A): STM<unknown, never, A> {
  return new STM(() => TExit.succeed(a))
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeedL<A>(a: () => A): STM<unknown, never, A> {
  return new STM(() => TExit.succeed(a()))
}

/**
 * Suspends creation of the specified transaction lazily.
 */
export function suspend<R, E, A>(f: () => STM<R, E, A>): STM<R, E, A> {
  return flatten(succeedL(f))
}

/**
 * "Peeks" at the success of transactional effect.
 */
export function tap_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R, E | E1, A> {
  return chain_(self, (a) => as_(f(a), a))
}

/**
 * "Peeks" at the success of transactional effect.
 *
 * @dataFirst tap_
 */
export function tap<A, R1, E1, B>(
  f: (a: A) => STM<R1, E1, B>
): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, A> {
  return (self) => tap_(self, f)
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: STM<R, E, A>,
  that: STM<R1, E1, B>,
  f: (a: A, b: B) => C
): STM<R1 & R, E | E1, C> {
  return chain_(self, (a) => map_(that, (b) => f(a, b)))
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, B, C>(
  that: STM<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, C> {
  return (self) => chain_(self, (a) => map_(that, (b) => f(a, b)))
}
