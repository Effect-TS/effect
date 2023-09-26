import type * as Exit from "../../../Exit"
import * as OpCodes from "../../../internal/stm/opCodes/tryCommit"
import type * as Journal from "../../../internal/stm/stm/journal"

/** @internal */
export type TryCommit<E, A> = Done<E, A> | Suspend

/** @internal */
export interface Done<E, A> {
  readonly _tag: OpCodes.OP_DONE
  readonly exit: Exit.Exit<E, A>
}

/** @internal */
export interface Suspend {
  readonly _tag: OpCodes.OP_SUSPEND
  readonly journal: Journal.Journal
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): TryCommit<E, A> => {
  return {
    _tag: OpCodes.OP_DONE,
    exit
  }
}

/** @internal */
export const suspend = (journal: Journal.Journal): TryCommit<never, never> => {
  return {
    _tag: OpCodes.OP_SUSPEND,
    journal
  }
}
