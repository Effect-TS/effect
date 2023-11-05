import type { Exit } from "../../../Exit.js"
import * as OpCodes from "../opCodes/tryCommit.js"
import type { Journal } from "./journal.js"

/** @internal */
export * as TryCommit from "./tryCommit.js"

declare module "./tryCommit.js" {
  export type TryCommit<E, A> = Done<E, A> | Suspend
}

/** @internal */
export interface Done<E, A> {
  readonly _tag: OpCodes.OP_DONE
  readonly exit: Exit<E, A>
}

/** @internal */
export interface Suspend {
  readonly _tag: OpCodes.OP_SUSPEND
  readonly journal: Journal
}

/** @internal */
export const done = <E, A>(exit: Exit<E, A>): TryCommit<E, A> => {
  return {
    _tag: OpCodes.OP_DONE,
    exit
  }
}

/** @internal */
export const suspend = (journal: Journal): TryCommit<never, never> => {
  return {
    _tag: OpCodes.OP_SUSPEND,
    journal
  }
}
