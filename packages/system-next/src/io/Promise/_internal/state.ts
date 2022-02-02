import type { Array } from "../../../collection/immutable/Array"
import type { Effect } from "../../Effect"

/**
 * @tsplus type ets/PromiseState
 */
export type PromiseState<E, A> = Pending<E, A> | Done<E, A>

/**
 * @tsplus type ets/PromiseStateOps
 */
export interface PromiseStateOps {}
export const PromiseState: PromiseStateOps = {}

export class Pending<E, A> {
  readonly _tag = "Pending"

  constructor(readonly joiners: Array<(_: Effect<unknown, E, A>) => void>) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  constructor(readonly value: Effect<unknown, E, A>) {}
}

/**
 * @tsplus static ets/PromiseStateOps pending
 */
export function pending<E, A>(
  joiners: Array<(_: Effect<unknown, E, A>) => void>
): PromiseState<E, A> {
  return new Pending(joiners)
}

/**
 * @tsplus static ets/PromiseStateOps done
 */
export function done<E, A>(value: Effect<unknown, E, A>): PromiseState<E, A> {
  return new Done(value)
}
