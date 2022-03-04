import { Exit } from "../../io/Exit"
import * as St from "../../prelude/Structural"
import type { TExit } from "./TExit"
import {
  DieTypeId,
  FailTypeId,
  InterruptTypeId,
  RetryTypeId,
  SucceedTypeId
} from "./TExit"

export const STMStateSym = Symbol.for("@effect-ts/core/stm/State")
export type STMStateSym = typeof STMStateSym

/**
 * @tsplus type ets/STMState
 */
export type State<E, A> = Done<E, A> | Interrupted | Running

/**
 * @tsplus type ets/STMStateOps
 */
export interface StateOps {}
export const State: StateOps = {}

/**
 * @tsplus unify ets/STMState
 */
export function unifyState<X extends State<any, any>>(
  self: X
): State<
  [X] extends [State<infer EX, any>] ? EX : never,
  [X] extends [State<any, infer AX>] ? AX : never
> {
  return self
}

export class Done<E, A> implements St.HasEquals, St.HasHash {
  readonly _tag = "Done";

  readonly [STMStateSym]: STMStateSym = STMStateSym

  constructor(readonly exit: Exit<E, A>) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.exit))
  }

  [St.equalsSym](that: unknown): boolean {
    return isState(that) && St.hash(this) === St.hash(that)
  }
}

export class Interrupted implements St.HasEquals, St.HasHash {
  readonly _tag = "Interrupted";

  readonly [STMStateSym]: STMStateSym = STMStateSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    return isState(that) && St.hash(this) === St.hash(that)
  }
}

export class Running implements St.HasEquals, St.HasHash {
  readonly _tag = "Running";

  readonly [STMStateSym]: STMStateSym = STMStateSym

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    return isState(that) && St.hash(this) === St.hash(that)
  }
}

/**
 * @tsplus static ets/STMStateOps isState
 */
export function isState(u: unknown): u is State<unknown, unknown> {
  return typeof u === "object" && u != null && STMStateSym in u
}

/**
 * @tsplus static ets/STMStateOps Done
 */
export function done<E, A>(exit: TExit<E, A>): State<E, A> {
  switch (exit._typeId) {
    case SucceedTypeId: {
      return new Done(Exit.succeed(exit.value))
    }
    case DieTypeId: {
      return new Done(Exit.die(exit.value))
    }
    case FailTypeId: {
      return new Done(Exit.fail(exit.value))
    }
    case InterruptTypeId: {
      return new Done(Exit.interrupt(exit.fiberId))
    }
    case RetryTypeId: {
      throw new Error("Bug: done being called on TExit.Retry")
    }
  }
}

/**
 * @tsplus static ets/STMStateOps Interrupted
 */
export const interrupted: State<never, never> = new Interrupted()

/**
 * @tsplus static ets/STMStateOps Running
 */
export const running: State<never, never> = new Running()

/**
 * @tsplus fluent ets/STMState isRunning
 */
export function isRunning<E, A>(self: State<E, A>): self is Running {
  return self._tag === "Running"
}
