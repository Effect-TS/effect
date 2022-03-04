import type { Exit } from "../../io/Exit"
import type { Journal } from "./Journal"

/**
 * @tsplus type ets/TryCommit
 */
export type TryCommit<E, A> = Done<E, A> | Suspend

/**
 * @tsplus type ets/TryCommitOps
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

export const DoneTypeId = Symbol.for("@effect-ts/core/STM/TryCommit/Done")
export type DoneTypeId = typeof DoneTypeId

export class Done<E, A> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly exit: Exit<E, A>) {}
}

export const SuspendTypeId = Symbol.for("@effect-ts/core/STM/TryCommit/Suspend")
export type SuspendTypeId = typeof SuspendTypeId

export class Suspend {
  readonly _typeId: SuspendTypeId = SuspendTypeId
  constructor(readonly journal: Journal) {}
}

/**
 * @tsplus static ets/TryCommitOps Done
 */
export function done<E, A>(exit: Exit<E, A>): TryCommit<E, A> {
  return new Done(exit)
}

/**
 * @tsplus static ets/TryCommitOps Suspend
 */
export function suspend(journal: Journal): TryCommit<never, never> {
  return new Suspend(journal)
}
