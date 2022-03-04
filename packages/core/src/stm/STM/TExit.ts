import type { FiberId } from "../../io/FiberId"
import * as St from "../../prelude/Structural"

/**
 * @tsplus type ets/TExit
 */
export type TExit<A, B> = Fail<A> | Die | Interrupt | Succeed<B> | Retry

/**
 * @tsplus type ets/TExitOps
 */
export interface TExitOps {}
export const TExit: TExitOps = {}

/**
 * @tsplus unify ets/TExit
 */
export function unifyTExit<X extends TExit<any, any>>(
  self: X
): TExit<
  [X] extends [TExit<infer EX, any>] ? EX : never,
  [X] extends [TExit<any, infer AX>] ? AX : never
> {
  return self
}

export const FailTypeId = Symbol.for("@effect-ts/core/STM/TExit/Fail")
export type FailTypeId = typeof FailTypeId

export class Fail<A> implements St.HasHash, St.HasEquals {
  readonly _typeId: FailTypeId = FailTypeId
  constructor(readonly value: A) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Fail && St.equals(this.value, that.value)
  }
}

export const DieTypeId = Symbol.for("@effect-ts/core/STM/TExit/Die")
export type DieTypeId = typeof DieTypeId

export class Die implements St.HasHash, St.HasEquals {
  readonly _typeId: DieTypeId = DieTypeId
  constructor(readonly value: unknown) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Die && St.equals(this.value, that.value)
  }
}

export const InterruptTypeId = Symbol.for("@effect-ts/core/STM/TExit/Interrupt")
export type InterruptTypeId = typeof InterruptTypeId

export class Interrupt implements St.HasHash, St.HasEquals {
  readonly _typeId: InterruptTypeId = InterruptTypeId
  constructor(readonly fiberId: FiberId) {}

  get [St.hashSym](): number {
    return St.hash(this.fiberId)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Interrupt && St.equals(this.fiberId, that.fiberId)
  }
}

export const SucceedTypeId = Symbol.for("@effect-ts/core/STM/TExit/Succeed")
export type SucceedTypeId = typeof SucceedTypeId

export class Succeed<B> implements St.HasHash, St.HasEquals {
  readonly _typeId: SucceedTypeId = SucceedTypeId
  constructor(readonly value: B) {}

  get [St.hashSym](): number {
    return St.hash(this.value)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Succeed && St.equals(this.value, that.value)
  }
}

export const RetryTypeId = Symbol.for("@effect-ts/core/STM/TExit/Retry")
export type RetryTypeId = typeof RetryTypeId

const _retryHash = St.randomInt()

export class Retry implements St.HasHash, St.HasEquals {
  readonly _typeId: RetryTypeId = RetryTypeId

  get [St.hashSym](): number {
    return St.opt(_retryHash)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Retry
  }
}

/**
 * @tsplus static ets/TExitOps unit
 */
export const unit: TExit<never, void> = new Succeed(undefined)

/**
 * @tsplus static ets/TExitOps Succeed
 */
export function succeed<A>(a: A): TExit<never, A> {
  return new Succeed(a)
}

/**
 * @tsplus static ets/TExitOps Fail
 */
export function fail<E>(e: E): TExit<E, never> {
  return new Fail(e)
}

/**
 * @tsplus static ets/TExitOps Die
 */
export function die(e: unknown): TExit<never, never> {
  return new Die(e)
}

/**
 * @tsplus static ets/TExitOps Interrupt
 */
export function interrupt(fiberId: FiberId): TExit<never, never> {
  return new Interrupt(fiberId)
}

/**
 * @tsplus static ets/TExitOps Retry
 */
export const retry: TExit<never, never> = new Retry()
