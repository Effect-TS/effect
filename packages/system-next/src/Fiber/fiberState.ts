import * as C from "../Cause"
import * as HS from "../Collections/Immutable/HashSet"
import type { UIO } from "../Effect"
import type * as Exit from "../Exit"
import type { FiberId } from "../FiberId"
import * as CancelerState from "./cancelerState"
import * as Status from "./status"

export type FiberState<E, A> = Executing<E, A> | Done<E, A>

export type Callback<E, A> = (exit: Exit.Exit<E, A>) => void

export class Executing<E, A> {
  readonly _tag = "Executing"

  constructor(
    readonly status: Status.Status,
    readonly observers: Array<Callback<never, Exit.Exit<E, A>>>,
    readonly suppressed: C.Cause<never>,
    readonly interruptors: HS.HashSet<FiberId>,
    readonly asyncCanceler: CancelerState.CancelerState,
    readonly mailbox: UIO<any> | undefined
  ) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  readonly suppressed = C.empty
  readonly status: Status.Status = new Status.Done()
  readonly interruptors: HS.HashSet<FiberId> = HS.make()

  constructor(readonly value: Exit.Exit<E, A>) {}
}

export function initial<E, A>(): FiberState<E, A> {
  return new Executing(
    new Status.Running(false),
    [],
    C.empty,
    HS.make(),
    CancelerState.Empty,
    undefined
  )
}
export function isInterrupting<E, A>(state: FiberState<E, A>): boolean {
  return Status.isInterrupting(state.status)
}

export function interruptorsCause<E, A>(state: FiberState<E, A>): C.Cause<never> {
  return HS.reduce_(state.interruptors, C.empty, (acc, interruptor) =>
    C.then(acc, C.interrupt(interruptor))
  )
}
