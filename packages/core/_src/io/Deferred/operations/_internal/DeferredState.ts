/**
 * @tsplus type ets/Deferred/State
 */
export type DeferredState<E, A> = Pending<E, A> | Done<E, A>

/**
 * @tsplus type ets/Deferred/State/Ops
 */
export interface DeferredStateOps {}
export const DeferredState: DeferredStateOps = {}

export class Pending<E, A> {
  readonly _tag = "Pending"

  constructor(readonly joiners: Array<(_: Effect<unknown, E, A>) => void>) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  constructor(readonly value: Effect<unknown, E, A>) {}
}

/**
 * @tsplus static ets/Deferred/State/Ops pending
 */
export function pending<E, A>(
  joiners: Array<(_: Effect<unknown, E, A>) => void>
): DeferredState<E, A> {
  return new Pending(joiners)
}

/**
 * @tsplus static ets/Deferred/State/Ops done
 */
export function done<E, A>(value: Effect<unknown, E, A>): DeferredState<E, A> {
  return new Done(value)
}
