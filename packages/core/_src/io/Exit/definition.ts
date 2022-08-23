import type { IFailure, ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus type effect/core/io/Exit/Success
 */
export interface Success<A> extends ISuccess<A>, Equals {}

/**
 * @tsplus type effect/core/io/Exit/Failure
 */
export interface Failure<E> extends IFailure<E>, Equals {}

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
