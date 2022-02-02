// ets_tracing: off

import "../../../Operator/index.js"

import * as St from "../../../Structural/index.js"

export type TExit<A, B> = Fail<A> | Succeed<B> | Retry | Die

export const FailTypeId = Symbol()
export type FailTypeId = typeof FailTypeId

export class Fail<A> {
  readonly _typeId: FailTypeId = FailTypeId
  constructor(readonly value: A) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Fail && St.equals(this.value, that.value)
  }
}

export const DieTypeId = Symbol()
export type DieTypeId = typeof DieTypeId

export class Die {
  readonly _typeId: DieTypeId = DieTypeId
  constructor(readonly value: unknown) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Die && St.equals(this.value, that.value)
  }
}

export const SucceedTypeId = Symbol()
export type SucceedTypeId = typeof SucceedTypeId

export class Succeed<B> {
  readonly _typeId: SucceedTypeId = SucceedTypeId
  constructor(readonly value: B) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Succeed && St.equals(this.value, that.value)
  }
}

export const RetryTypeId = Symbol()
export type RetryTypeId = typeof RetryTypeId

const _retryHash = St.randomInt()

export class Retry {
  readonly _typeId: RetryTypeId = RetryTypeId

  get [St.hashSym](): number {
    return St.opt(_retryHash)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Retry
  }
}

export const unit: TExit<never, void> = new Succeed(undefined)

export function succeed<A>(a: A): TExit<never, A> {
  return new Succeed(a)
}

export function fail<E>(e: E): TExit<E, never> {
  return new Fail(e)
}

export function die(e: unknown): TExit<never, never> {
  return new Die(e)
}

export const retry: TExit<never, never> = new Retry()
