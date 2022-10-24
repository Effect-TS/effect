import type { Journal } from "@effect/core/stm/STM/definition/primitives"

/**
 * @tsplus type effect/core/stm/STM/TryCommit
 * @category model
 * @since 1.0.0
 */
export type TryCommit<E, A> = Done<E, A> | Suspend

/**
 * @tsplus type effect/core/stm/STM/TryCommit.Ops
 * @category model
 * @since 1.0.0
 */
export interface TryCommitOps {}
export const TryCommit: TryCommitOps = {}

export function unifyTryCommit<X extends TryCommit<any, any>>(
  self: X
): TryCommit<
  [X] extends [TryCommit<infer EX, any>] ? EX : never,
  [X] extends [TryCommit<any, infer AX>] ? AX : never
> {
  return self
}

/**
 * @category model
 * @since 1.0.0
 */
export class Done<E, A> {
  readonly _tag = "Done"

  constructor(readonly exit: Exit<E, A>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class Suspend {
  readonly _tag = "Suspend"

  constructor(readonly journal: Journal) {}
}

/**
 * @tsplus static effect/core/stm/STM/TryCommit.Ops done
 * @category constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): TryCommit<E, A> {
  return new Done(exit)
}

/**
 * @tsplus static effect/core/stm/STM/TryCommit.Ops suspend
 * @category constructors
 * @since 1.0.0
 */
export function suspend(journal: Journal): TryCommit<never, never> {
  return new Suspend(journal)
}
