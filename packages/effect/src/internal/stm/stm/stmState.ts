import * as Equal from "../../../Equal.js"
import * as Exit from "../../../Exit.js"
import { pipe } from "../../../Function.js"
import * as Hash from "../../../Hash.js"
import { hasProperty } from "../../../Predicate.js"
import * as OpCodes from "../opCodes/stmState.js"
import * as TExitOpCodes from "../opCodes/tExit.js"
import type * as TExit from "./tExit.js"

/** @internal */
const STMStateSymbolKey = "effect/STM/State"

/** @internal */
export const STMStateTypeId = Symbol.for(STMStateSymbolKey)

/** @internal */
export type STMStateTypeId = typeof STMStateTypeId

/** @internal */
export type STMState<E, A> = Done<E, A> | Interrupted | Running

/** @internal */
export interface Done<out E, out A> extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly _tag: OpCodes.OP_DONE
  readonly exit: Exit.Exit<E, A>
}

/** @internal */
export interface Interrupted extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly _tag: OpCodes.OP_INTERRUPTED
}

/** @internal */
export interface Running extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly _tag: OpCodes.OP_RUNNING
}

/** @internal */
export const isSTMState = (u: unknown): u is STMState<unknown, unknown> => hasProperty(u, STMStateTypeId)

/** @internal */
export const isRunning = <E, A>(self: STMState<E, A>): self is Running => {
  return self._tag === OpCodes.OP_RUNNING
}

/** @internal */
export const isDone = <E, A>(self: STMState<E, A>): self is Done<E, A> => {
  return self._tag === OpCodes.OP_DONE
}

/** @internal */
export const isInterrupted = <E, A>(self: STMState<E, A>): self is Interrupted => {
  return self._tag === OpCodes.OP_INTERRUPTED
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): STMState<E, A> => {
  return {
    [STMStateTypeId]: STMStateTypeId,
    _tag: OpCodes.OP_DONE,
    exit,
    [Hash.symbol](): number {
      return pipe(
        Hash.hash(STMStateSymbolKey),
        Hash.combine(Hash.hash(OpCodes.OP_DONE)),
        Hash.combine(Hash.hash(exit))
      )
    },
    [Equal.symbol](that: unknown): boolean {
      return isSTMState(that) && that._tag === OpCodes.OP_DONE && Equal.equals(exit, that.exit)
    }
  }
}

/** @internal */
export const interrupted: STMState<never, never> = {
  [STMStateTypeId]: STMStateTypeId,
  _tag: OpCodes.OP_INTERRUPTED,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(STMStateSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_INTERRUPTED)),
      Hash.combine(Hash.hash("interrupted"))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isSTMState(that) && that._tag === OpCodes.OP_INTERRUPTED
  }
}

/** @internal */
export const running: STMState<never, never> = {
  [STMStateTypeId]: STMStateTypeId,
  _tag: OpCodes.OP_RUNNING,
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(STMStateSymbolKey),
      Hash.combine(Hash.hash(OpCodes.OP_RUNNING)),
      Hash.combine(Hash.hash("running"))
    )
  },
  [Equal.symbol](that: unknown): boolean {
    return isSTMState(that) && that._tag === OpCodes.OP_RUNNING
  }
}

/** @internal */
export const fromTExit = <E, A>(tExit: TExit.TExit<E, A>): STMState<E, A> => {
  switch (tExit._tag) {
    case TExitOpCodes.OP_FAIL: {
      return done(Exit.fail(tExit.error))
    }
    case TExitOpCodes.OP_DIE: {
      return done(Exit.die(tExit.defect))
    }
    case TExitOpCodes.OP_INTERRUPT: {
      return done(Exit.interrupt(tExit.fiberId))
    }
    case TExitOpCodes.OP_SUCCEED: {
      return done(Exit.succeed(tExit.value))
    }
    case TExitOpCodes.OP_RETRY: {
      throw new Error(
        "BUG: STM.STMState.fromTExit - please report an issue at https://github.com/Effect-TS/effect/issues"
      )
    }
  }
}
