/**
 * tracing: off
 */
import * as C from "../Cause"
import type * as Exit from "../Exit"
import * as S from "../Sync"
import type { Status } from "./status"
import { Done, Running } from "./status"

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

export const initial = <E, A>(): FiberState<E, A> =>
  new FiberStateExecuting(new Running(false), [], C.empty)

export const interrupting = <E, A>(state: FiberState<E, A>) => {
  const loop = (status: Status): S.UIO<boolean> =>
    S.gen(function* (_) {
      switch (status._tag) {
        case "Running": {
          return status.interrupting
        }
        case "Finishing": {
          return status.interrupting
        }
        case "Suspended": {
          return yield* _(loop(status.previous))
        }
        case "Done": {
          return false
        }
      }
    })

  return S.run(loop(state.status))
}
