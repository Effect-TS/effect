// tracing: off

import "../../Operator"

import { RuntimeError } from "../../Cause"
import * as T from "../../Effect"
import * as E from "../../Either"
import { identity } from "../../Function"
import * as O from "../../Option"
import { AtomicBoolean } from "../../Support/AtomicBoolean"
import * as P from "./_internal/primitives"
import { tryCommit, tryCommitAsync } from "./Journal"
import { DoneTypeId, SuspendTypeId } from "./TryCommit"
import { makeTxnId } from "./TxnId"

export {
  catchAll,
  catchAll_,
  chain,
  chain_,
  ensuring,
  ensuring_,
  fail,
  failL,
  foldM,
  foldM_,
  map,
  map_,
  provideSome,
  provideSome_,
  retry,
  STM,
  succeed,
  succeedL,
  unit,
  STMEffect,
  STMFailException,
  STMRetryException
} from "./_internal/primitives"

export const MaxFrames = 200

/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 */
export function absolve<R, E, E1, A>(
  z: P.STM<R, E, E.Either<E1, A>>
): P.STM<R, E | E1, A> {
  return P.chain_(z, fromEither)
}

/**
 * Like chain but ignores the input
 */
export function andThen_<R, E, A, R1, E1, B>(
  self: P.STM<R, E, A>,
  that: P.STM<R1, E1, B>
): P.STM<R1 & R, E | E1, B> {
  return P.chain_(self, () => that)
}

/**
 * Like chain but ignores the input
 *
 * @dataFirst andThen_
 */
export function andThen<R1, E1, B>(
  that: P.STM<R1, E1, B>
): <R, E, A>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, B> {
  return (self) => andThen_(self, that)
}

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as_<R, E, A, B>(self: P.STM<R, E, A>, b: B): P.STM<R, E, B> {
  return P.map_(self, () => b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<A, B>(b: B): <R, E>(self: P.STM<R, E, A>) => P.STM<R, E, B> {
  return (self) => as_(self, b)
}

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(self: P.STM<R, E, A>): P.STM<R, E, O.Option<A>> {
  return P.map_(self, O.some)
}

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(self: P.STM<R, E, A>): P.STM<R, O.Option<E>, A> {
  return mapError_(self, O.some)
}

/**
 * Returns an `STM` effect whose P.failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, B>(
  self: P.STM<R, E, A>,
  g: (e: E) => E1,
  f: (a: A) => B
): P.STM<R, E1, B> {
  return P.foldM_(
    self,
    (e) => P.fail(g(e)),
    (a) => P.succeed(f(a))
  )
}

/**
 * Returns an `STM` effect whose P.failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @dataFirst bimap_
 */
export function bimap<R, E, A, E1, B>(
  g: (e: E) => E1,
  f: (a: A) => B
): (self: P.STM<R, E, A>) => P.STM<R, E1, B> {
  return (self) => bimap_(self, g, f)
}

/**
 * Atomically performs a batch of operations in a single transaction.
 */
export function atomically<R, E, A>(stm: P.STM<R, E, A>) {
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
 * Recovers from specified error.
 *
 * @dataFirst catch_
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => P.STM<R1, E1, A1>,
  __trace?: string
) {
  return <R, A>(
    self: P.STM<R, E, A>
  ): P.STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    P.catchAll_(self, (e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return P.fail(e as any)
    })
}
export { _catch as catch }

/**
 * Recovers from specified error.
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  self: P.STM<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => P.STM<R1, E1, A1>
): P.STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return P.catchAll_(self, (e) => {
    if (tag in e && e[tag] === k) {
      return f(e as any)
    }
    return P.fail(e as any)
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
>(k: K, f: (e: Extract<E, { _tag: K }>) => P.STM<R1, E1, A1>, __trace?: string) {
  return <R, A>(
    self: P.STM<R, E, A>
  ): P.STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> => catchTag_(self, k, f)
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
  self: P.STM<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => P.STM<R1, E1, A1>
): P.STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return P.catchAll_(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return P.fail(e as any)
  })
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, B>(
  self: P.STM<R, E, A>,
  f: (e: E) => O.Option<P.STM<R1, E1, B>>
): P.STM<R1 & R, E | E1, A | B> {
  return P.catchAll_(
    self,
    (e): P.STM<R1, E | E1, A | B> => O.fold_(f(e), () => P.fail(e), identity)
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchSome_
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => O.Option<P.STM<R1, E1, B>>
): <R, A>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, A | B> {
  return (self) => catchSome_(self, f)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailM_<R, E, E1, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return P.chain_(
    fa,
    (a): P.STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => P.fail(e))
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailM_
 */
export function continueOrFailM<E1, A, R2, E2, A2>(
  e: E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFailM_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, E1, A, A2>(
  fa: P.STM<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailM_(fa, e, (x) => O.map_(pf(x), P.succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFail_
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFail_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailML_<R, E, E1, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return P.chain_(
    fa,
    (a): P.STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => P.failL(e))
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailML_
 */
export function continueOrFailML<E1, A, R2, E2, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFailML_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFailL_<R, E, E1, A, A2>(
  fa: P.STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailML_(fa, e, (x) => O.map_(pf(x), P.succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFailL_
 */
export function continueOrFailL<E1, A, A2>(e: () => E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFailL_(fa, e, pf)
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function checkL(predicate: () => boolean) {
  return suspend(() => (predicate() ? P.unit : P.retry))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function check(predicate: boolean) {
  return checkL(() => predicate)
}

/**
 * Kills the fiber running the effect.
 */
export function die(u: unknown): P.STM<unknown, never, never> {
  return P.succeedL(() => {
    throw u
  })
}

/**
 * Kills the fiber running the effect.
 */
export function dieL(u: () => unknown): P.STM<unknown, never, never> {
  return P.succeedL(() => {
    throw u()
  })
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessage(message: string): P.STM<unknown, never, never> {
  return P.succeedL(() => {
    throw new RuntimeError(message)
  })
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessageL(message: () => string): P.STM<unknown, never, never> {
  return P.succeedL(() => {
    throw new RuntimeError(message())
  })
}

/**
 * Folds over the `STM` effect, handling both P.failure and success, but not
 * retry.
 */
export function fold_<R, E, A, B, C>(
  self: P.STM<R, E, A>,
  g: (e: E) => C,
  f: (a: A) => B
): P.STM<R, never, B | C> {
  return P.foldM_(
    self,
    (e) => P.succeed(g(e)),
    (a) => P.succeed(f(a))
  )
}

/**
 * Folds over the `STM` effect, handling both P.failure and success, but not
 * retry.
 *
 * @dataFirst fold_
 */
export function fold<E, A, B, C>(
  g: (e: E) => C,
  f: (a: A) => B
): <R>(self: P.STM<R, E, A>) => P.STM<R, never, B | C> {
  return (self) => fold_(self, g, f)
}

/**
 * Flattens out a nested `STM` effect.
 */
export function flatten<R, E, R1, E1, B>(
  self: P.STM<R, E, P.STM<R1, E1, B>>
): P.STM<R1 & R, E | E1, B> {
  return P.chain_(self, identity)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns a transactional effect that produces a new `ReadonlyArray<B>`.
 */
export function forEach_<A, R, E, B>(
  it: Iterable<A>,
  f: (a: A) => P.STM<R, E, B>
): P.STM<R, E, readonly B[]> {
  return suspend(() => {
    let stm = P.succeed([]) as P.STM<R, E, B[]>

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
  f: (a: A) => P.STM<R, E, B>
): (it: Iterable<A>) => P.STM<R, E, readonly B[]> {
  return (self) => forEach_(self, f)
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEitherL<E, A>(e: () => E.Either<E, A>): P.STM<unknown, E, A> {
  return suspend(() => {
    return E.fold_(e(), P.fail, P.succeed)
  })
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEither<E, A>(e: E.Either<E, A>): P.STM<unknown, E, A> {
  return E.fold_(e, P.fail, P.succeed)
}

/**
 * Maps from one error type to another.
 */
export function mapError_<R, E, A, E1>(
  self: P.STM<R, E, A>,
  f: (a: E) => E1
): P.STM<R, E1, A> {
  return P.foldM_(self, (e) => P.fail(f(e)), P.succeed)
}

/**
 * Maps from one error type to another.
 *
 * @dataFirst mapError_
 */
export function mapError<E, E1>(
  f: (a: E) => E1
): <R, A>(self: P.STM<R, E, A>) => P.STM<R, E1, A> {
  return (self) => mapError_(self, f)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(self: P.STM<R, E, A>, r: R): P.STM<unknown, E, A> {
  return P.provideSome_(self, () => r)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @dataFirst provideAll_
 */
export function provideAll<R>(
  r: R
): <E, A>(self: P.STM<R, E, A>) => P.STM<unknown, E, A> {
  return (self) => provideAll_(self, r)
}

/**
 * Suspends creation of the specified transaction lazily.
 */
export function suspend<R, E, A>(f: () => P.STM<R, E, A>): P.STM<R, E, A> {
  return flatten(P.succeedL(f))
}

/**
 * "Peeks" at the success of transactional effect.
 */
export function tap_<R, E, A, R1, E1, B>(
  self: P.STM<R, E, A>,
  f: (a: A) => P.STM<R1, E1, B>
): P.STM<R1 & R, E | E1, A> {
  return P.chain_(self, (a) => as_(f(a), a))
}

/**
 * "Peeks" at the success of transactional effect.
 *
 * @dataFirst tap_
 */
export function tap<A, R1, E1, B>(
  f: (a: A) => P.STM<R1, E1, B>
): <R, E>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, A> {
  return (self) => tap_(self, f)
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: P.STM<R, E, A>,
  that: P.STM<R1, E1, B>,
  f: (a: A, b: B) => C
): P.STM<R1 & R, E | E1, C> {
  return P.chain_(self, (a) => P.map_(that, (b) => f(a, b)))
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, B, C>(
  that: P.STM<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, C> {
  return (self) => P.chain_(self, (a) => P.map_(that, (b) => f(a, b)))
}
