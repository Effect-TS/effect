import { CancelerState } from "@effect/core/io/Fiber/_internal/cancelerState"
import { FiberStatus } from "@effect/core/io/Fiber/status"

/**
 * @tsplus type ets/Fiber/State
 */
export type FiberState<E, A> = Executing<E, A> | Done<E, A>

/**
 * @tsplus type ets/Fiber/State/Ops
 */
export interface FiberStateOps {}
export const FiberState: FiberStateOps = {}

/**
 * @tsplus unify ets/Fiber/State
 */
export function unifyFiberState<X extends FiberState<any, any>>(
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
    readonly mailbox: Effect<never, never, unknown> | undefined
  ) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  readonly suppressed = Cause.empty
  readonly status: FiberStatus = FiberStatus.Done
  readonly interruptors: HashSet<FiberId> = HashSet.empty()

  constructor(readonly value: Exit<E, A>) {}
}

/**
 * @tsplus static ets/Fiber/State/Ops Executing
 */
export function executing<E, A>(
  status: FiberStatus,
  observers: List<Callback<never, Exit<E, A>>>,
  suppressed: Cause<never>,
  interruptors: HashSet<FiberId>,
  asyncCanceler: CancelerState,
  mailbox: Effect<never, never, unknown> | undefined
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
 * @tsplus static ets/Fiber/State/Ops Done
 */
export function done<E, A>(value: Exit<E, A>): FiberState<E, A> {
  return new Done(value)
}

/**
 * @tsplus static ets/Fiber/State/Ops initial
 */
export function initial<E, A>(): FiberState<E, A> {
  return new Executing(
    FiberStatus.Running(false),
    List.empty(),
    Cause.empty,
    HashSet.empty(),
    CancelerState.Empty,
    undefined
  )
}

/**
 * @tsplus getter ets/Fiber/State isInterrupting
 */
export function isInterrupting<E, A>(self: FiberState<E, A>): boolean {
  return self.status.isInterrupting
}

/**
 * @tsplus getter ets/Fiber/State interruptorsCause
 */
export function interruptorsCause<E, A>(state: FiberState<E, A>): Cause<never> {
  return state.interruptors.reduce(
    Cause.empty,
    (acc, interruptor) => acc + Cause.interrupt(interruptor)
  )
}
