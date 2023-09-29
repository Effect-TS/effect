import * as Equal from "../../../Equal"
import type * as FiberId from "../../../FiberId"
import { pipe } from "../../../Function"
import * as Hash from "../../../Hash"
import * as OpCodes from "../../../internal/stm/opCodes/tExit"

/** @internal */
const TExitSymbolKey = "effect/TExit"

/** @internal */
export const TExitTypeId = Symbol.for(TExitSymbolKey)

/** @internal */
export type TExitTypeId = typeof TExitTypeId

/** @internal */
export type TExit<E, A> = Fail<E> | Die | Interrupt | Succeed<A> | Retry

/** @internal */
export declare namespace TExit {
  /** @internal */
  export interface Variance<E, A> {
    readonly [TExitTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/** @internal */
const variance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export interface Fail<E> extends TExit.Variance<E, never>, Equal.Equal {
  readonly _tag: OpCodes.OP_FAIL
  readonly error: E
}

/** @internal */
export interface Die extends TExit.Variance<never, never>, Equal.Equal {
  readonly _tag: OpCodes.OP_DIE
  readonly defect: unknown
}

/** @internal */
export interface Interrupt extends TExit.Variance<never, never>, Equal.Equal {
  readonly _tag: OpCodes.OP_INTERRUPT
  readonly fiberId: FiberId.FiberId
}

/** @internal */
export interface Succeed<A> extends TExit.Variance<never, A>, Equal.Equal {
  readonly _tag: OpCodes.OP_SUCCEED
  readonly value: A
}

/** @internal */
export interface Retry extends TExit.Variance<never, never>, Equal.Equal {
  readonly _tag: OpCodes.OP_RETRY
}

/** @internal */
export const isExit = (u: unknown): u is TExit<unknown, unknown> => {
  return typeof u === "object" && u != null && TExitTypeId in u
}

/** @internal */
export const isFail = <E, A>(self: TExit<E, A>): self is Fail<E> => {
  return self._tag === OpCodes.OP_FAIL
}

/** @internal */
export const isDie = <E, A>(self: TExit<E, A>): self is Die => {
  return self._tag === OpCodes.OP_DIE
}

/** @internal */
export const isInterrupt = <E, A>(self: TExit<E, A>): self is Interrupt => {
  return self._tag === OpCodes.OP_INTERRUPT
}

/** @internal */
export const isSuccess = <E, A>(self: TExit<E, A>): self is Succeed<A> => {
  return self._tag === OpCodes.OP_SUCCEED
}

/** @internal */
export const isRetry = <E, A>(self: TExit<E, A>): self is Retry => {
  return self._tag === OpCodes.OP_RETRY
}

/** @internal */
export const fail = <E>(error: E): TExit<E, never> => ({
  [TExitTypeId]: variance,
  _tag: OpCodes.OP_FAIL,
  error,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TExitSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_FAIL)),
      Hash.combine(Hash.hash(error))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isExit(that) && that._tag === OpCodes.OP_FAIL && Equal.equals(error, that.error)
  }
})

/** @internal */
export const die = (defect: unknown): TExit<never, never> => ({
  [TExitTypeId]: variance,
  _tag: OpCodes.OP_DIE,
  defect,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TExitSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_DIE)),
      Hash.combine(Hash.hash(defect))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isExit(that) && that._tag === OpCodes.OP_DIE && Equal.equals(defect, that.defect)
  }
})

/** @internal */
export const interrupt = (fiberId: FiberId.FiberId): TExit<never, never> => ({
  [TExitTypeId]: variance,
  _tag: OpCodes.OP_INTERRUPT,
  fiberId,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TExitSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_INTERRUPT)),
      Hash.combine(Hash.hash(fiberId))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isExit(that) && that._tag === OpCodes.OP_INTERRUPT && Equal.equals(fiberId, that.fiberId)
  }
})

/** @internal */
export const succeed = <A>(value: A): TExit<never, A> => ({
  [TExitTypeId]: variance,
  _tag: OpCodes.OP_SUCCEED,
  value,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TExitSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_SUCCEED)),
      Hash.combine(Hash.hash(value))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isExit(that) && that._tag === OpCodes.OP_SUCCEED && Equal.equals(value, that.value)
  }
})

/** @internal */
export const retry: TExit<never, never> = {
  [TExitTypeId]: variance,
  _tag: OpCodes.OP_RETRY,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TExitSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_RETRY)),
      Hash.combine(Hash.hash("retry"))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isExit(that) && isRetry(that)
  }
}

/** @internal */
export const unit = (): TExit<never, void> => succeed(undefined)
