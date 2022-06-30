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
 * @tsplus unify effect/core/stm/TExit
 */
export function unifyTExit<X extends TExit<any, any>>(
  self: X
): TExit<
  [X] extends [TExit<infer EX, any>] ? EX : never,
  [X] extends [TExit<any, infer AX>] ? AX : never
> {
  return self
}

export class Fail<A> implements Equals {
  readonly _tag = "Fail"

  constructor(readonly value: A) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Fail && Equals.equals(this.value, that.value)
  }
}

export class Die implements Equals {
  readonly _tag = "Die"

  constructor(readonly value: unknown) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Die && Equals.equals(this.value, that.value)
  }
}

export class Interrupt implements Equals {
  readonly _tag = "Interrupt"

  constructor(readonly fiberId: FiberId) {}

  [Hash.sym](): number {
    return Hash.unknown(this.fiberId)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Interrupt && Equals.equals(this.fiberId, that.fiberId)
  }
}

export class Succeed<B> implements Equals {
  readonly _tag = "Succeed"

  constructor(readonly value: B) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Succeed && Equals.equals(this.value, that.value)
  }
}

const _retryHash = Hash.random()

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
