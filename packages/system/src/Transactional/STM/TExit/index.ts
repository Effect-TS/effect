// tracing: off

import "../../../Operator"

export type TExit<A, B> = Fail<A> | Succeed<B> | Retry

export const FailTypeId = Symbol()
export type FailTypeId = typeof FailTypeId

export class Fail<A> {
  readonly _typeId: FailTypeId = FailTypeId
  constructor(readonly value: A) {}
}

export const SucceedTypeId = Symbol()
export type SucceedTypeId = typeof SucceedTypeId

export class Succeed<B> {
  readonly _typeId: SucceedTypeId = SucceedTypeId
  constructor(readonly value: B) {}
}

export const RetryTypeId = Symbol()
export type RetryTypeId = typeof RetryTypeId

export class Retry {
  readonly _typeId: RetryTypeId = RetryTypeId
}

export const unit: TExit<never, void> = new Succeed(undefined)

export function succeed<A>(a: A): TExit<never, A> {
  return new Succeed(a)
}

export function fail<E>(e: E): TExit<E, never> {
  return new Fail(e)
}

export const retry: TExit<never, never> = new Retry()
