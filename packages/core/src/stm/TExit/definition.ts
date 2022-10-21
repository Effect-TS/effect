/**
 * @tsplus type effect/core/stm/TExit
 */
export type TExit<A, B> = Fail<A> | Die | Interrupt | Succeed<B> | Retry

/**
 * @tsplus type effect/core/stm/TExit.Ops
 */
export interface TExitOps {
  $: TExitAspects
}
export const TExit: TExitOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TExit.Aspects
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
 */
export class Fail<E> implements Equals {
  readonly _tag = "Fail"
  readonly _E!: () => E
  readonly _A!: () => never

  constructor(readonly value: E) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Fail && Equals.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Die
 */
export class Die implements Equals {
  readonly _tag = "Die"
  readonly _E!: () => never
  readonly _A!: () => never

  constructor(readonly value: unknown) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Die && Equals.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Interrupt
 */
export class Interrupt implements Equals {
  readonly _tag = "Interrupt"
  readonly _E!: () => never
  readonly _A!: () => never

  constructor(readonly fiberId: FiberId) {}

  [Hash.sym](): number {
    return Hash.unknown(this.fiberId)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Interrupt && Equals.equals(this.fiberId, that.fiberId)
  }
}

/**
 * @tsplus type effect/core/stm/TExit/Succeed
 */
export class Succeed<A> implements Equals {
  readonly _tag = "Succeed"
  readonly _E!: () => never
  readonly _A!: () => A

  constructor(readonly value: A) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Succeed && Equals.equals(this.value, that.value)
  }
}

const _retryHash = Hash.random()

/**
 * @tsplus type effect/core/stm/TExit/Retry
 */
export class Retry implements Equals {
  readonly _tag = "Retry";

  [Hash.sym](): number {
    return Hash.optimize(_retryHash)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Retry
  }
}

/**
 * @tsplus static effect/core/stm/TExit.Ops unit
 */
export const unit: TExit<never, void> = new Succeed(undefined)

/**
 * @tsplus static effect/core/stm/TExit.Ops succeed
 */
export function succeed<A>(a: A): TExit<never, A> {
  return new Succeed(a)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops fail
 */
export function fail<E>(e: E): TExit<E, never> {
  return new Fail(e)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops die
 */
export function die(e: unknown): TExit<never, never> {
  return new Die(e)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops interrupt
 */
export function interrupt(fiberId: FiberId): TExit<never, never> {
  return new Interrupt(fiberId)
}

/**
 * @tsplus static effect/core/stm/TExit.Ops retry
 */
export const retry: TExit<never, never> = new Retry()
