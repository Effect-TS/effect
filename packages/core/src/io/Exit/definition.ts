import type { IFailure, ISuccess } from "@effect/core/io/Effect/definition/primitives"
import type * as Equal from "@fp-ts/data/Equal"

/**
 * @tsplus type effect/core/io/Exit
 * @category model
 * @since 1.0.0
 */
export type Exit<E, A> = Success<A> | Failure<E>

/**
 * @tsplus type effect/core/io/Exit/Success
 * @category model
 * @since 1.0.0
 */
export interface Success<A> extends ISuccess<A>, Equal.Equal {}

/**
 * @tsplus type effect/core/io/Exit/Failure
 * @category model
 * @since 1.0.0
 */
export interface Failure<E> extends IFailure<E>, Equal.Equal {}

/**
 * @tsplus type effect/core/io/Exit.Ops
 * @category model
 * @since 1.0.0
 */
export interface ExitOps {
  $: ExitAspects
}
export const Exit: ExitOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Exit.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ExitAspects {}

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
