import type { Lazy } from "../../../data/Function"
import type { FiberId } from "../../../io/FiberId"
import type { Journal } from "../Journal"
import type { STM } from "./base"
import { STMBase } from "./base"

export const STMEffectTypeId = Symbol.for("@effect-ts/core/STM/Effect")
export type STMEffectTypeId = typeof STMEffectTypeId

export class STMEffect<R, E, A> extends STMBase<R, E, A> {
  readonly _typeId: STMEffectTypeId = STMEffectTypeId
  constructor(readonly f: (journal: Journal, fiberId: FiberId, environment: R) => A) {
    super()
  }
}

export const STMOnFailureTypeId = Symbol.for("@effect-ts/core/STM/OnFailure")
export type STMOnFailureTypeId = typeof STMOnFailureTypeId

export class STMOnFailure<R, E, E1, A> extends STMBase<R, E1, A> {
  readonly _typeId: STMOnFailureTypeId = STMOnFailureTypeId
  constructor(readonly stm: STM<R, E, A>, readonly onFailure: (e: E) => STM<R, E1, A>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
}

export const STMOnRetryTypeId = Symbol.for("@effect-ts/core/STM/OnRetry")
export type STMOnRetryTypeId = typeof STMOnRetryTypeId

export class STMOnRetry<R, E, A, R1, E1, A1> extends STMBase<R, E, A> {
  readonly _typeId: STMOnRetryTypeId = STMOnRetryTypeId
  constructor(readonly stm: STM<R, E, A>, readonly onRetry: Lazy<STM<R1, E1, A1>>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
}

export const STMOnSuccessTypeId = Symbol.for("@effect-ts/core/STM/OnSuccess")
export type STMOnSuccessTypeId = typeof STMOnSuccessTypeId

export class STMOnSuccess<R, E, A, B> extends STMBase<R, E, B> {
  readonly _typeId: STMOnSuccessTypeId = STMOnSuccessTypeId
  constructor(readonly stm: STM<R, E, A>, readonly apply: (a: A) => STM<R, E, B>) {
    super()
  }
}

export const STMProvideTypeId = Symbol.for("@effect-ts/core/STM/Provide")
export type STMProvideTypeId = typeof STMProvideTypeId

export class STMProvide<R0, R, E, A> extends STMBase<R, E, A> {
  readonly _typeId: STMProvideTypeId = STMProvideTypeId
  constructor(readonly stm: STM<R0, E, A>, readonly f: (r: R) => R0) {
    super()
  }
}

export const STMSucceedNowTypeId = Symbol.for("@effect-ts/core/STM/SucceedNow")
export type STMSucceedNowTypeId = typeof STMSucceedNowTypeId

export class STMSucceedNow<R, E, A> extends STMBase<R, E, A> {
  readonly _typeId: STMSucceedNowTypeId = STMSucceedNowTypeId
  constructor(readonly a: A) {
    super()
  }
}

export const STMSucceedTypeId = Symbol.for("@effect-ts/core/STM/Succeed")
export type STMSucceedTypeId = typeof STMSucceedTypeId

export class STMSucceed<R, E, A> extends STMBase<R, E, A> {
  readonly _typeId: STMSucceedTypeId = STMSucceedTypeId
  constructor(readonly a: Lazy<A>) {
    super()
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
  | STMProvide<unknown, R, E, A> {
  //
}

export const FailExceptionTypeId = Symbol.for("@effect-ts/core/STM/FailException")
export type FailExceptionTypeId = typeof FailExceptionTypeId

export class STMFailException<E> {
  readonly _typeId: FailExceptionTypeId = FailExceptionTypeId
  constructor(readonly e: E) {}
}

/**
 * @tsplus static ets/STMOps isFailException
 */
export function isFailException(u: unknown): u is STMFailException<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === FailExceptionTypeId
  )
}

export const DieExceptionTypeId = Symbol.for("@effect-ts/core/STM/DieException")
export type DieExceptionTypeId = typeof DieExceptionTypeId

export class STMDieException<E> {
  readonly _typeId: DieExceptionTypeId = DieExceptionTypeId
  constructor(readonly e: E) {}
}

/**
 * @tsplus static ets/STMOps isDieException
 */
export function isDieException(u: unknown): u is STMDieException<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === DieExceptionTypeId
  )
}

export const InterruptExceptionTypeId = Symbol.for(
  "@effect-ts/core/STM/InterruptException"
)
export type InterruptExceptionTypeId = typeof InterruptExceptionTypeId

export class STMInterruptException {
  readonly _typeId: InterruptExceptionTypeId = InterruptExceptionTypeId
  constructor(readonly fiberId: FiberId) {}
}

/**
 * @tsplus static ets/STMOps isInterruptException
 */
export function isInterruptException(u: unknown): u is STMInterruptException {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === InterruptExceptionTypeId
  )
}

export const RetryExceptionTypeId = Symbol.for("@effect-ts/core/STM/RetryException")
export type RetryExceptionTypeId = typeof RetryExceptionTypeId

export class STMRetryException {
  readonly _typeId: RetryExceptionTypeId = RetryExceptionTypeId
}

/**
 * @tsplus static ets/STMOps isRetryException
 */
export function isRetryException(u: unknown): u is STMRetryException {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === RetryExceptionTypeId
  )
}
