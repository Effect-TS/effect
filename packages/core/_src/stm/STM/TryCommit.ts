import type { Journal } from "@effect/core/stm/STM/definition/primitives"

/**
 * @tsplus type effect/core/stm/STM/TryCommit
 */
export type TryCommit<E, A> = Done<E, A> | Suspend

/**
 * @tsplus type effect/core/stm/STM/TryCommit.Ops
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

export class Done<E, A> {
  readonly _tag = "Done"

  constructor(readonly exit: Exit<E, A>) {}
}

export class Suspend {
  readonly _tag = "Suspend"

  constructor(readonly journal: Journal) {}
}

/**
 * @tsplus static effect/core/stm/STM/TryCommit.Ops done
 */
export function done<E, A>(exit: Exit<E, A>): TryCommit<E, A> {
  return new Done(exit)
}

/**
 * @tsplus static effect/core/stm/STM/TryCommit.Ops suspend
 */
export function suspend(journal: Journal): TryCommit<never, never> {
  return new Suspend(journal)
}
