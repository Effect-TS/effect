import { HashSet } from "../../../collection/immutable/HashSet"
import { List } from "../../../collection/immutable/List"
import { Cause } from "../../Cause"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import type { FiberId } from "../../FiberId"
import { FiberStatus } from "../status"
import { CancelerState } from "./cancelerState"

/**
 * @tsplus type ets/FiberState
 */
export type FiberState<E, A> = Executing<E, A> | Done<E, A>

/**
 * @tsplus type ets/FiberStateOps
 */
export interface FiberStateOps {}
export const FiberState: FiberStateOps = {}

/**
 * @tsplus unify ets/FiberState
 */
export function unify<X extends FiberState<any, any>>(
  self: X
): FiberState<
  [X] extends [FiberState<infer EX, any>] ? EX : never,
  [X] extends [FiberState<any, infer AX>] ? AX : never
> {
  return self
}

export type Callback<E, A> = (exit: Exit<E, A>) => void

export class Executing<E, A> {
  readonly _tag = "Executing"

  constructor(
    readonly status: FiberStatus,
    readonly observers: List<Callback<never, Exit<E, A>>>,
    readonly suppressed: Cause<never>,
    readonly interruptors: HashSet<FiberId>,
    readonly asyncCanceler: CancelerState,
    readonly mailbox: UIO<any> | undefined
  ) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  readonly suppressed = Cause.empty
  readonly status: FiberStatus = FiberStatus.Done
  readonly interruptors: HashSet<FiberId> = HashSet()

  constructor(readonly value: Exit<E, A>) {}
}

/**
 * @tsplus static ets/FiberStateOps Executing
 */
export function executing<E, A>(
  status: FiberStatus,
  observers: List<Callback<never, Exit<E, A>>>,
  suppressed: Cause<never>,
  interruptors: HashSet<FiberId>,
  asyncCanceler: CancelerState,
  mailbox: UIO<any> | undefined
): FiberState<E, A> {
  return new Executing(
    status,
    observers,
    suppressed,
    interruptors,
    asyncCanceler,
    mailbox
  )
}

/**
 * @tsplus static ets/FiberStateOps Done
 */
export function done<E, A>(value: Exit<E, A>): FiberState<E, A> {
  return new Done(value)
}

/**
 * @tsplus static ets/FiberStateOps initial
 */
export function initial<E, A>(): FiberState<E, A> {
  return new Executing(
    FiberStatus.Running(false),
    List.empty(),
    Cause.empty,
    HashSet(),
    CancelerState.Empty,
    undefined
  )
}

/**
 * @tsplus fluent ets/FiberState isInterrupting
 */
export function isInterrupting<E, A>(self: FiberState<E, A>): boolean {
  return self.status.isInterrupting()
}

/**
 * @tsplus fluent ets/FiberState interruptorsCause
 */
export function interruptorsCause<E, A>(state: FiberState<E, A>): Cause<never> {
  return state.interruptors.reduce(
    Cause.empty,
    (acc, interruptor) => acc + Cause.interrupt(interruptor)
  )
}
