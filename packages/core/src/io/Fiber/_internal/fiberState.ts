import * as HS from "../../../collection/immutable/HashSet"
import { Cause } from "../../Cause"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import type { FiberId } from "../../FiberId"
import * as Status from "../status"
import * as CancelerState from "./cancelerState"

export type FiberState<E, A> = Executing<E, A> | Done<E, A>

export type Callback<E, A> = (exit: Exit<E, A>) => void

export class Executing<E, A> {
  readonly _tag = "Executing"

  constructor(
    readonly status: Status.Status,
    readonly observers: Array<Callback<never, Exit<E, A>>>,
    readonly suppressed: Cause<never>,
    readonly interruptors: HS.HashSet<FiberId>,
    readonly asyncCanceler: CancelerState.CancelerState,
    readonly mailbox: UIO<any> | undefined
  ) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  readonly suppressed = Cause.empty
  readonly status: Status.Status = new Status.Done()
  readonly interruptors: HS.HashSet<FiberId> = HS.make()

  constructor(readonly value: Exit<E, A>) {}
}

export function initial<E, A>(): FiberState<E, A> {
  return new Executing(
    new Status.Running(false),
    [],
    Cause.empty,
    HS.make(),
    CancelerState.Empty,
    undefined
  )
}
export function isInterrupting<E, A>(state: FiberState<E, A>): boolean {
  return Status.isInterrupting(state.status)
}

export function interruptorsCause<E, A>(state: FiberState<E, A>): Cause<never> {
  return state.interruptors.reduce(
    Cause.empty,
    (acc, interruptor) => acc + Cause.interrupt(interruptor)
  )
}
