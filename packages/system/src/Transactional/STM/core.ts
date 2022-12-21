// ets_tracing: off

import "../../Operator/index.js"

import { RuntimeError } from "../../Cause/index.js"
import * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import type { Predicate, Refinement } from "../../Function/index.js"
import { constVoid, identity } from "../../Function/index.js"
import { NoSuchElementException } from "../../GlobalExceptions/index.js"
import * as O from "../../Option/index.js"
import { AtomicBoolean } from "../../Support/AtomicBoolean/index.js"
import * as P from "./_internal/primitives.js"
import { tryCommit, tryCommitAsync } from "./Journal/index.js"
import { DoneTypeId, SuspendTypeId } from "./TryCommit/index.js"
import { makeTxnId } from "./TxnId/index.js"

export {
  catchAll,
  catchAll_,
  chain,
  chain_,
  ensuring,
  ensuring_,
  fail,
  failWith,
  foldM,
  foldM_,
  map,
  map_,
  provideSome,
  provideSome_,
  retry,
  STM,
  STMEffect,
  STMFailException,
  STMRetryException,
  succeed,
  succeedWith,
  unit,
  die,
  dieWith
} from "./_internal/primitives.js"
export { _catch as catch }

export const MaxFrames = 200

/**
 * Accesses the environment of the transaction.
 */
export function access<R, A>(f: (r: R) => A): P.STM<R, never, A> {
  return P.map_(environment<R>(), f)
}

/**
 * Accesses the environment of the transaction to perform a transaction.
 */
export function accessM<R0, R, E, A>(f: (r: R0) => P.STM<R, E, A>) {
  return P.chain_(environment<R0>(), f)
}

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
 * Propagates the given environment to self.
 */
export function andThen_<R, E, A, E1, B>(
  self: P.STM<R, E, A>,
  that: P.STM<A, E1, B>
): P.STM<R, E | E1, B> {
  return P.chain_(self, (a) => provideAll_(that, a))
}

/**
 * Propagates the given environment to self.
 *
 * @ets_data_first andThen_
 */
export function andThen<A, E1, B>(
  that: P.STM<A, E1, B>
): <R, E>(self: P.STM<R, E, A>) => P.STM<R, E | E1, B> {
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
 * @ets_data_first as_
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
 * @ets_data_first bimap_
 */
export function bimap<R, E, A, E1, B>(
  g: (e: E) => E1,
  f: (a: A) => B
): (self: P.STM<R, E, A>) => P.STM<R, E1, B> {
  return (self) => bimap_(self, g, f)
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catch_
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
      if (typeof e === "object" && e !== null && tag in e && e[tag] === k) {
        return f(e as any)
      }
      return P.fail(e as any)
    })
}

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
    if (typeof e === "object" && e !== null && tag in e && e[tag] === k) {
      return f(e as any)
    }
    return P.fail(e as any)
  })
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catchTag_
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
 * @ets_data_first catchSome_
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => O.Option<P.STM<R1, E1, B>>
): <R, A>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, A | B> {
  return (self) => catchSome_(self, f)
}

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 */
export function continueOrRetryM_<R, E, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
): P.STM<R2 & R, E | E2, A2> {
  return P.chain_(fa, (a): P.STM<R2, E2, A2> => O.getOrElse_(pf(a), () => P.retry))
}

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 *
 * @ets_data_first continueOrRetryM_
 */
export function continueOrRetryM<A, R2, E2, A2>(
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R2 & R, E | E2, A2> {
  return (fa) => continueOrRetryM_(fa, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrRetry_<R, E, A, A2>(
  fa: P.STM<R, E, A>,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrRetryM_(fa, (x) => O.map_(pf(x), P.succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrRetry_
 */
export function continueOrRetry<A, A2>(pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrRetry_(fa, pf)
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
 * @ets_data_first continueOrFailM_
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
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFail_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailWithM_<R, E, E1, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return P.chain_(
    fa,
    (a): P.STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => P.failWith(e))
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailWithM_
 */
export function continueOrFailWithM<E1, A, R2, E2, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<P.STM<R2, E2, A2>>
) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFailWithM_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFailWith_<R, E, E1, A, A2>(
  fa: P.STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailWithM_(fa, e, (x) => O.map_(pf(x), P.succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFailWith_
 */
export function continueOrFailWith<E1, A, A2>(e: () => E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: P.STM<R, E, A>) => continueOrFailWith_(fa, e, pf)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @ets_data_first chainError_
 */
export function chainError<E, R2, E2>(f: (e: E) => P.STM<R2, never, E2>) {
  return <R, A>(self: P.STM<R, E, A>) => chainError_(self, f)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError_<R, E, A, R2, E2>(
  self: P.STM<R, E, A>,
  f: (e: E) => P.STM<R2, never, E2>
) {
  return flipWith_(self, (x) => P.chain_(x, f))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function checkWith(predicate: () => boolean) {
  return suspend(() => (predicate() ? P.unit : P.retry))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function check(predicate: boolean) {
  return checkWith(() => predicate)
}

/**
 * Propagates self environment to that.
 */
export function compose_<R, E, A, R1, E1>(
  self: P.STM<R, E, A>,
  that: P.STM<R1, E1, R>
) {
  return andThen_(that, self)
}

/**
 * Propagates self environment to that.
 *
 * @ets_data_first compose_
 */
export function compose<R, R1, E1>(that: P.STM<R1, E1, R>) {
  return <E, A>(self: P.STM<R, E, A>) => andThen_(that, self)
}

/**
 * Commits this transaction atomically.
 */
export function commit<R, E, A>(self: P.STM<R, E, A>) {
  return T.accessM((r: R) =>
    T.suspend((_, fiberId) => {
      const v = tryCommit(fiberId, self, r)

      switch (v._typeId) {
        case DoneTypeId: {
          return v.io
        }
        case SuspendTypeId: {
          const txnId = makeTxnId()
          const done = new AtomicBoolean(false)
          const interrupt = T.succeedWith(() => done.set(true))
          const io = T.effectAsync(
            tryCommitAsync(v.journal, fiberId, self, txnId, done, r)
          )
          return T.ensuring_(io, interrupt)
        }
      }
    })
  )
}

/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 */
export function commitEither<R, E, A>(self: P.STM<R, E, A>): T.Effect<R, E, A> {
  return T.absolve(commit(either(self)))
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessage(message: string): P.STM<unknown, never, never> {
  return P.dieWith(() => new RuntimeError(message))
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessageWith(message: () => string): P.STM<unknown, never, never> {
  return P.succeedWith(() => {
    throw new RuntimeError(message())
  })
}

/**
 * Converts the failure channel into an `Either`.
 */
export function either<R, E, A>(self: P.STM<R, E, A>): P.STM<R, never, E.Either<E, A>> {
  return fold_(
    self,
    (x) => E.left(x),
    (x) => E.right(x)
  )
}

/**
 * Retrieves the environment inside an stm.
 */
export function environment<R>(): P.STM<R, never, R> {
  return new P.STMEffect((_, __, r: R) => r)
}

/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(self: P.STM<R, E, A>): P.STM<R, never, A> {
  return P.foldM_(self, () => eventually(self), P.succeed)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @ets_data_first filterOrDie_
 */
export function filterOrDie<A, B extends A>(
  p: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E, B>
export function filterOrDie<A>(
  p: Predicate<A>,
  dieWith: (a: A) => unknown
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E, A>
export function filterOrDie<A>(p: Predicate<A>, dieWith: unknown) {
  return <R, E>(fa: P.STM<R, E, A>): P.STM<R, E, A> =>
    filterOrDie_(fa, p, dieWith as (a: A) => unknown)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: P.STM<R, E, A>,
  p: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): P.STM<R, E, B>
export function filterOrDie_<R, E, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  dieWith: (a: A) => unknown
): P.STM<R, E, A>
export function filterOrDie_<R, E, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  dieWith: unknown
) {
  return filterOrElse_(fa, p, (x) => P.dieWith(() => (dieWith as (a: A) => unknown)(x)))
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @ets_data_first filterOrFail_
 */
export function filterOrFail<A, B extends A, E1>(
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E | E1, B>
export function filterOrFail<A, E1>(
  p: Predicate<A>,
  failWith: (a: A) => E1
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E | E1, A>
export function filterOrFail<A, E1>(p: Predicate<A>, failWith: unknown) {
  return <R, E>(fa: P.STM<R, E, A>): P.STM<R, E | E1, A> =>
    filterOrFail_(fa, p, failWith as (a: A) => E1)
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, E1, A, B extends A>(
  fa: P.STM<R, E, A>,
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): P.STM<R, E | E1, B>
export function filterOrFail_<R, E, E1, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  failWith: (a: A) => E1
): P.STM<R, E | E1, A>
export function filterOrFail_<R, E, E1, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  failWith: unknown
) {
  return filterOrElse_(fa, p, (x) => P.fail((failWith as (a: A) => E1)(x)))
}

/**
 * Applies `or` if the predicate fails.
 *
 * @ets_data_first filterOrElse_
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => P.STM<R2, E2, A2>
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R & R2, E | E2, B | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: (a: A) => P.STM<R2, E2, A2>
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R & R2, E | E2, A | A2>
export function filterOrElse<A, R2, E2, A2>(p: Predicate<A>, or: unknown) {
  return <R, E>(fa: P.STM<R, E, A>) =>
    filterOrElse_(fa, p, or as (a: A) => P.STM<R2, E2, A2>)
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => P.STM<R2, E2, A2>
): P.STM<R & R2, E | E2, B | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  or: (a: A) => P.STM<R2, E2, A2>
): P.STM<R & R2, E | E2, A | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  or: unknown
): P.STM<R & R2, E | E2, A | A2> {
  return P.chain_(
    fa,
    (a): P.STM<R2, E2, A | A2> =>
      p(a) ? P.succeed(a) : suspend(() => (or as (a: A) => P.STM<R2, E2, A2>)(a))
  )
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 *
 * @ets_data_first filterOrDieMessage_
 */
export function filterOrDieMessage<A, B extends A>(
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E, B>
export function filterOrDieMessage<A>(
  p: Predicate<A>,
  message: (a: A) => string
): <R, E>(fa: P.STM<R, E, A>) => P.STM<R, E, A>
export function filterOrDieMessage<A>(p: Predicate<A>, message: unknown) {
  return <R, E>(fa: P.STM<R, E, A>): P.STM<R, E, A> =>
    filterOrDieMessage_(fa, p, message as (a: A) => string)
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: P.STM<R, E, A>,
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): P.STM<R, E, B>
export function filterOrDieMessage_<R, E, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  message: (a: A) => string
): P.STM<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  fa: P.STM<R, E, A>,
  p: Predicate<A>,
  message: unknown
) {
  return filterOrDie_(fa, p, (a) => new RuntimeError((message as (a: A) => string)(a)))
}

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 */
export function flip<R, E, A>(self: P.STM<R, E, A>) {
  return P.foldM_(self, P.succeed, P.fail)
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @ets_data_first flipWith_
 */
export function flipWith<R, E, A, R2, E2, A2>(
  f: (self: P.STM<R, A, E>) => P.STM<R2, A2, E2>
) {
  return (self: P.STM<R, E, A>): P.STM<R2, E2, A2> => flipWith_(self, f)
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 */
export function flipWith_<R, E, A, R2, E2, A2>(
  self: P.STM<R, E, A>,
  f: (self: P.STM<R, A, E>) => P.STM<R2, A2, E2>
) {
  return flip(f(flip(self)))
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
 * @ets_data_first fold_
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
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @ets_data_first flattenErrorOptionWith_
 */
export function flattenErrorOptionWith<E2>(def: () => E2) {
  return <R, E, A>(self: P.STM<R, O.Option<E>, A>): P.STM<R, E | E2, A> =>
    flattenErrorOptionWith_(self, def)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOptionWith_<R, E, A, E2>(
  self: P.STM<R, O.Option<E>, A>,
  def: () => E2
): P.STM<R, E | E2, A> {
  return mapError_(self, O.fold(def, identity))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @ets_data_first flattenErrorOption_
 */
export function flattenErrorOption<E2>(def: E2) {
  return <R, E, A>(self: P.STM<R, O.Option<E>, A>): P.STM<R, E | E2, A> =>
    flattenErrorOption_(self, def)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOption_<R, E, A, E2>(
  self: P.STM<R, O.Option<E>, A>,
  def: E2
): P.STM<R, E | E2, A> {
  return mapError_(
    self,
    O.fold(() => def, identity)
  )
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
 * @ets_data_first forEach_
 */
export function forEach<A, R, E, B>(
  f: (a: A) => P.STM<R, E, B>
): (it: Iterable<A>) => P.STM<R, E, readonly B[]> {
  return (self) => forEach_(self, f)
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEitherWith<E, A>(e: () => E.Either<E, A>): P.STM<unknown, E, A> {
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
 * Unwraps the optional success of this effect, but can fail with an None value.
 */
export function get<R, E, A>(self: P.STM<R, E, O.Option<A>>): P.STM<R, O.Option<E>, A> {
  return P.foldM_(
    self,
    (x) => P.fail(O.some(x)),
    O.fold(() => P.fail(O.none), P.succeed)
  )
}

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 */
export function head<R, E, A>(
  self: P.STM<R, E, Iterable<A>>
): P.STM<R, O.Option<E>, A> {
  return P.foldM_(
    self,
    (x) => P.fail(O.some(x)),
    (x) => {
      const it = x[Symbol.iterator]()
      const next = it.next()
      return next.done ? P.fail(O.none) : P.succeed(next.value)
    }
  )
}

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(self: P.STM<R, E, A>): P.STM<R, never, void> {
  return fold_(self, constVoid, constVoid)
}

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(self: P.STM<R, E, A>) {
  return fold_(
    self,
    () => true,
    () => false
  )
}

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(self: P.STM<R, E, A>) {
  return fold_(
    self,
    () => false,
    () => true
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error `None`.
 */
export function left<R, E, B, C>(
  self: P.STM<R, E, E.Either<B, C>>
): P.STM<R, O.Option<E>, B> {
  return P.foldM_(
    self,
    (e) => P.fail(O.some(e)),
    E.fold(P.succeed, () => P.fail(O.none))
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: P.STM<R, E, E.Either<B, C>>,
  orFail: (c: C) => E1
) {
  return P.chain_(
    self,
    E.fold(P.succeed, (x) => P.failWith(() => orFail(x)))
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @ets_data_first leftOrFail_
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: P.STM<R, E, E.Either<B, C>>) => leftOrFail_(self, orFail)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with a `NoSuchElementException`.
 */
export function leftOrFailException<R, E, B, C>(self: P.STM<R, E, E.Either<B, C>>) {
  return leftOrFail_(self, () => new NoSuchElementException())
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first join_
 */
export function join<R1, E1, A1>(that: P.STM<R1, E1, A1>) {
  return <R, E, A>(self: P.STM<R, E, A>): P.STM<E.Either<R, R1>, E | E1, A | A1> => {
    return join_(self, that)
  }
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join_<R, E, A, R1, E1, A1>(
  self: P.STM<R, E, A>,
  that: P.STM<R1, E1, A1>
): P.STM<E.Either<R, R1>, E | E1, A | A1> {
  return accessM(
    (_: E.Either<R, R1>): P.STM<unknown, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => provideAll_(self, r),
        (r1) => provideAll_(that, r1)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  self: P.STM<R, E, A>,
  that: P.STM<R1, E1, A1>
): P.STM<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return accessM(
    (_: E.Either<R, R1>): P.STM<unknown, E | E1, E.Either<A, A1>> =>
      E.fold_(
        _,
        (r) => P.map_(provideAll_(self, r), E.left),
        (r1) => P.map_(provideAll_(that, r1), E.right)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: P.STM<R1, E1, A1>
): (self: P.STM<R, E, A>) => P.STM<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return (self) => joinEither_(self, that)
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
 * @ets_data_first mapError_
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
 * @ets_data_first provideAll_
 */
export function provideAll<R>(
  r: R
): <E, A>(self: P.STM<R, E, A>) => P.STM<unknown, E, A> {
  return (self) => provideAll_(self, r)
}

/**
 * Repeats this `STM` effect until its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatUntil` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryUntil` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually satisfy the predicate.
 */
export function repeatUntil_<R, E, A>(
  self: P.STM<R, E, A>,
  f: (a: A) => boolean
): P.STM<R, E, A> {
  return P.chain_(self, (a) => (f(a) ? P.succeed(a) : repeatUntil_(self, f)))
}

/**
 * Repeats this `STM` effect until its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatUntil` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryUntil` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually satisfy the predicate.
 *
 * @ets_data_first repeatUntil_
 */
export function repeatUntil<A>(
  f: (a: A) => boolean
): <R, E>(self: P.STM<R, E, A>) => P.STM<R, E, A> {
  return (self) => repeatUntil_(self, f)
}

/**
 * Repeats this `STM` effect while its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatWhile` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryWhile` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually not satisfy the predicate.
 */
export function repeatWhile_<R, E, A>(
  self: P.STM<R, E, A>,
  f: (a: A) => boolean
): P.STM<R, E, A> {
  return P.chain_(self, (a) => (f(a) ? repeatWhile_(self, f) : P.succeed(a)))
}

/**
 * Repeats this `STM` effect while its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatWhile` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryWhile` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually not satisfy the predicate.
 *
 * @ets_data_first repeatWhile_
 */
export function repeatWhile<R, E, A>(
  f: (a: A) => boolean
): (self: P.STM<R, E, A>) => P.STM<R, E, A> {
  return (self) => repeatWhile_(self, f)
}

/**
 * Suspends creation of the specified transaction lazily.
 */
export function suspend<R, E, A>(f: () => P.STM<R, E, A>): P.STM<R, E, A> {
  return flatten(P.succeedWith(f))
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
 * @ets_data_first tap_
 */
export function tap<A, R1, E1, B>(
  f: (a: A) => P.STM<R1, E1, B>
): <R, E>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, A> {
  return (self) => tap_(self, f)
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeftWith<A>(a: () => A): P.STM<unknown, never, E.Either<A, never>> {
  return P.chain_(P.succeedWith(a), (x) => P.succeed(E.left(x)))
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeft<A>(a: A): P.STM<unknown, never, E.Either<A, never>> {
  return P.succeed(E.left(a))
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
 * @ets_data_first zipWith_
 */
export function zipWith<A, R1, E1, B, C>(
  that: P.STM<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(self: P.STM<R, E, A>) => P.STM<R1 & R, E | E1, C> {
  return (self) => P.chain_(self, (a) => P.map_(that, (b) => f(a, b)))
}
