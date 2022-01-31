// ets_tracing: off

import * as C from "../Cause/index.js"
import type * as Exit from "../Exit/index.js"
import type { Status } from "./status.js"
import { Done, Running } from "./status.js"

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

  readonly interrupted = C.empty
  readonly status: Status = new Done()

  constructor(readonly value: Exit.Exit<E, A>) {}
}

export function initial<E, A>(): FiberState<E, A> {
  return new FiberStateExecuting(new Running(false), [], C.empty)
}

export function interrupting<E, A>(state: FiberState<E, A>): boolean {
  let current: Status | undefined = state.status

  while (current) {
    switch (current._tag) {
      case "Running": {
        return current.interrupting
      }
      case "Finishing": {
        return current.interrupting
      }
      case "Done": {
        return false
      }
      case "Suspended": {
        current = current.previous
      }
    }
  }
  throw new Error("BUG: should never end up here")
}
