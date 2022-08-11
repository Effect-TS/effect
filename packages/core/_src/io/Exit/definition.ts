/**
 * @tsplus type effect/core/io/Exit
 */
export type Exit<E, A> = Success<A> | Failure<E>

/**
 * @tsplus type effect/core/io/Exit.Ops
 */
export interface ExitOps {
  $: ExitAspects
}
export const Exit: ExitOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Exit.Aspects
 */
export interface ExitAspects {}

/**
 * @tsplus type effect/core/io/Exit/Success
 */
export class Success<A> implements Equals {
  readonly _tag = "Success"

  constructor(readonly value: A) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Success && Equals.equals(this.value, that.value)
  }
}

/**
 * @tsplus type effect/core/io/Exit/Failure
 */
export class Failure<E> implements Equals {
  readonly _tag = "Failure"

  constructor(readonly cause: Cause<E>) {}

  [Hash.sym](): number {
    return Hash.unknown(this.cause)
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Failure && Equals.equals(this.cause, that.cause)
  }
}

/**
 * @tsplus unify effect/core/io/Exit/Success
 * @tsplus unify effect/core/io/Exit/Failure
 */
export function unifyExit<X extends Exit<any, any>>(
  self: X
): Exit<
  X extends Failure<infer EX> ? EX : never,
  X extends Success<infer AX> ? AX : never
> {
  return self
}
