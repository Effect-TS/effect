import { STMBase } from "@effect-ts/core/stm/STM/definition/base";
import type { Journal } from "@effect-ts/core/stm/STM/Journal";

export class STMEffect<R, E, A> extends STMBase<R, E, A> {
  readonly _tag = "STMEffect";

  constructor(readonly f: (journal: Journal, fiberId: FiberId, environment: R) => A) {
    super();
  }
}

export class STMOnFailure<R, E, E1, A> extends STMBase<R, E1, A> {
  readonly _tag = "STMOnFailure";

  constructor(readonly stm: STM<R, E, A>, readonly onFailure: (e: E) => STM<R, E1, A>) {
    super();
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a);
  }
}

export class STMOnRetry<R, E, A, R1, E1, A1> extends STMBase<R, E, A> {
  readonly _tag = "STMOnRetry";

  constructor(readonly stm: STM<R, E, A>, readonly onRetry: Lazy<STM<R1, E1, A1>>) {
    super();
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a);
  }
}

export class STMOnSuccess<R, E, A, B> extends STMBase<R, E, B> {
  readonly _tag = "STMOnSuccess";

  constructor(readonly stm: STM<R, E, A>, readonly apply: (a: A) => STM<R, E, B>) {
    super();
  }
}

export class STMProvide<R0, R, E, A> extends STMBase<R, E, A> {
  readonly _tag = "STMProvide";

  constructor(readonly stm: STM<R0, E, A>, readonly f: (r: R) => R0) {
    super();
  }
}

export class STMSucceedNow<R, E, A> extends STMBase<R, E, A> {
  readonly _tag = "STMSucceedNow";

  constructor(readonly a: A) {
    super();
  }
}

export class STMSucceed<R, E, A> extends STMBase<R, E, A> {
  readonly _tag = "STMSucceed";

  constructor(readonly a: Lazy<A>) {
    super();
  }
}

/**
 * @tsplus macro remove
 */
export function concreteSTM<R, E, A>(
  _: STM<R, E, A>
): asserts _ is
  | STMEffect<R, E, A>
  | STMOnFailure<R, unknown, E, A>
  | STMOnSuccess<R, E, unknown, A>
  | STMOnRetry<R, E, A, unknown, unknown, unknown>
  | STMSucceed<R, E, A>
  | STMSucceedNow<R, E, A>
  | STMProvide<unknown, R, E, A>
{
  //
}

export const STMFailExceptionSym = Symbol.for("@effect-ts/core/stm/STM/FailException");
export type STMFailExceptionSym = typeof STMFailExceptionSym;

export class STMFailException<E> {
  readonly [STMFailExceptionSym]: STMFailExceptionSym = STMFailExceptionSym;
  constructor(readonly e: E) {}
}

/**
 * @tsplus static ets/STM/Ops isFailException
 */
export function isFailException(u: unknown): u is STMFailException<unknown> {
  return typeof u === "object" && u != null && STMFailExceptionSym in u;
}

export const STMDieExceptionSym = Symbol.for("@effect-ts/core/stm/STM/DieException");
export type STMDieExceptionSym = typeof STMDieExceptionSym;

export class STMDieException<E> {
  readonly [STMDieExceptionSym]: STMDieExceptionSym = STMDieExceptionSym;
  constructor(readonly e: E) {}
}

/**
 * @tsplus static ets/STM/Ops isDieException
 */
export function isDieException(u: unknown): u is STMDieException<unknown> {
  return typeof u === "object" && u != null && STMDieExceptionSym in u;
}

export const STMInterruptExceptionSym = Symbol.for("@effect-ts/core/stm/STM/InterruptException");
export type STMInterruptExceptionSym = typeof STMInterruptExceptionSym;

export class STMInterruptException {
  readonly [STMInterruptExceptionSym]: STMInterruptExceptionSym = STMInterruptExceptionSym;
  constructor(readonly fiberId: FiberId) {}
}

/**
 * @tsplus static ets/STM/Ops isInterruptException
 */
export function isInterruptException(u: unknown): u is STMInterruptException {
  return typeof u === "object" && u != null && STMInterruptExceptionSym in u;
}

export const STMRetryExceptionSym = Symbol.for("@effect-ts/core/stm/STM/RetryException");
export type STMRetryExceptionSym = typeof STMRetryExceptionSym;

export class STMRetryException {
  readonly [STMRetryExceptionSym]: STMRetryExceptionSym = STMRetryExceptionSym;
}

/**
 * @tsplus static ets/STM/Ops isRetryException
 */
export function isRetryException(u: unknown): u is STMRetryException {
  return typeof u === "object" && u != null && STMRetryExceptionSym in u;
}
