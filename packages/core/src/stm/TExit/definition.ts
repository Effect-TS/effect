import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const TExitSymbolKey = "@effect/core/stm/TExit"

/**
 * @category symbol
 * @since 1.0.0
 */
export const TExitTypeId = Symbol.for(TExitSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type TExitTypeId = typeof TExitTypeId

/**
 * @tsplus type effect/core/stm/TExit
 * @category model
 * @since 1.0.0
 */
export type TExit<A, B> = Fail<A> | Die | Interrupt | Succeed<B> | Retry

/**
 * @tsplus type effect/core/stm/TExit.Ops
 * @category model
 * @since 1.0.0
 */
export interface TExitOps {
  $: TExitAspects
}
export const TExit: TExitOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TExit.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TExitAspects {}

/**
 * @tsplus unify effect/core/stm/TExit/Fail
 * @tsplus unify effect/core/stm/TExit/Die
 * @tsplus unify effect/core/stm/TExit/Interrupt
 * @tsplus unify effect/core/stm/TExit/Succeed
 * @tsplus unify effect/core/stm/TExit/Retry
 */
export function unifyTExit<X extends TExit<any, any>>(
  self: X
): TExit<
  [X] extends [{ _E: () => infer E }] ? E : never,
  [X] extends [{ _A: () => infer A }] ? A : never
> {
  return self
}

/**
 * @tsplus type effect/core/stm/TExit/Fail
 * @category model
 * @since 1.0.0
 */
export class Fail<E> implements Equal.Equal {
  readonly _tag = "Fail"
  readonly _E!: () => E
  readonly _A!: () => never
  readonly _id: TExitTypeId = TExitTypeId

  constructor(readonly value: E) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) &&
      that._tag === "Fail" &&
      Equal.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Die
 */
export class Die implements Equal.Equal {
  readonly _tag = "Die"
  readonly _E!: () => never
  readonly _A!: () => never
  readonly _id: TExitTypeId = TExitTypeId

  constructor(readonly value: unknown) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) &&
      that._tag === "Die" &&
      Equal.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Interrupt
 */
export class Interrupt implements Equal.Equal {
  readonly _tag = "Interrupt"
  readonly _E!: () => never
  readonly _A!: () => never
  readonly _id: TExitTypeId = TExitTypeId

  constructor(readonly fiberId: FiberId) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.fiberId))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) &&
      that._tag === "Interrupt" &&
      Equal.equals(this.fiberId, that.fiberId)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Succeed
 */
export class Succeed<A> implements Equal.Equal {
  readonly _tag = "Succeed"
  readonly _E!: () => never
  readonly _A!: () => A
  readonly _id: TExitTypeId = TExitTypeId

  constructor(readonly value: A) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) &&
      that._tag === "Succeed" &&
      Equal.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Retry
 */
export class Retry implements Equal.Equal {
  readonly _tag = "Retry"
  readonly _id: TExitTypeId = TExitTypeId;

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && that._tag === "Retry"
  }
}

/**
 * @tsplus static effect/core/stm/TExit.Ops isTExit
 * @category refinements
 * @since 1.0.0
 */
export function isTExit(u: unknown): u is TExit<unknown, unknown> {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === TExitTypeId
}

/**
 * @tsplus static effect/core/stm/TExit.Ops unit
 * @category constructors
 * @since 1.0.0
 */
export const unit: TExit<never, void> = new Succeed(undefined)

/**
 * @tsplus static effect/core/stm/TExit.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<A>(a: A): TExit<never, A> {
  return new Succeed(a)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): TExit<E, never> {
  return new Fail(e)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(e: unknown): TExit<never, never> {
  return new Die(e)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops interrupt
 * @category constructors
 * @since 1.0.0
 */
export function interrupt(fiberId: FiberId): TExit<never, never> {
  return new Interrupt(fiberId)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops retry
 * @category constructors
 * @since 1.0.0
 */
export const retry: TExit<never, never> = new Retry()
