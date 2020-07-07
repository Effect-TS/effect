import * as C from "../Cause"
import * as Exit from "../Exit"
import { FiberRef } from "../FiberRef/fiberRef"

import { Done, Running, Status } from "./status"

export type FiberState<E, A> = FiberStateExecuting<E, A> | FiberStateDone<E, A>

export type Callback<E, A> = (exit: Exit.Exit<E, A>) => void

export class FiberStateExecuting<E, A> {
  readonly _tag = "Executing"

  constructor(
    readonly status: Status,
    readonly observers: Callback<never, Exit.Exit<E, A>>[],
    readonly interrupted: C.Cause<never>
  ) {}
}

export class FiberStateDone<E, A> {
  readonly _tag = "Done"

  readonly interrupted = C.Empty
  readonly status: Status = new Done()

  constructor(readonly value: Exit.Exit<E, A>) {}
}

export const initial = <E, A>(): FiberState<E, A> =>
  new FiberStateExecuting(new Running(false), [], C.Empty)

export type FiberRefLocals = Map<FiberRef<any>, any>

export const interrupting = <E, A>(state: FiberState<E, A>) => {
  const loop = (status: Status): boolean => {
    switch (status._tag) {
      case "Running": {
        return status.interrupting
      }
      case "Finishing": {
        return status.interrupting
      }
      case "Suspended": {
        return loop(status.previous)
      }
      case "Done": {
        return false
      }
    }
  }

  return loop(state.status)
}
