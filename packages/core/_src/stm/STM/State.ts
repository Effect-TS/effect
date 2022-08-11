export const STMStateSym = Symbol.for("@effect/core/stm/STM/State")
export type STMStateSym = typeof STMStateSym

/**
 * @tsplus type effect/core/stm/STM/State
 */
export type State<E, A> = Done<E, A> | Interrupted | Running

/**
 * @tsplus type effect/core/stm/STM/State.Ops
 */
export interface StateOps {}
export const State: StateOps = {}

/**
 * @tsplus unify effect/core/stm/STM/State/Done
 * @tsplus unify effect/core/stm/STM/State/Interrupted
 * @tsplus unify effect/core/stm/STM/State/Running
 */
export function unifyState<X extends State<any, any>>(
  self: X
): State<
  X extends Done<infer EX, any> ? EX : never,
  X extends Done<any, infer AX> ? AX : never
> {
  return self
}

/**
 * @tsplus type effect/core/stm/STM/State/Done
 */
export class Done<E, A> implements Equals {
  readonly _tag = "Done"

  readonly [STMStateSym]: STMStateSym = STMStateSym

  constructor(readonly exit: Exit<E, A>) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.unknown(this.exit))
  }

  [Equals.sym](that: unknown): boolean {
    return isState(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

/**
 * @tsplus type effect/core/stm/STM/State/Interrupted
 */
export class Interrupted implements Equals {
  readonly _tag = "Interrupted"

  readonly [STMStateSym]: STMStateSym = STMStateSym;

  [Hash.sym](): number {
    return Hash.string(this._tag)
  }

  [Equals.sym](that: unknown): boolean {
    return isState(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

/**
 * @tsplus type effect/core/stm/STM/State/Running
 */
export class Running implements Equals {
  readonly _tag = "Running"

  readonly [STMStateSym]: STMStateSym = STMStateSym;

  [Hash.sym](): number {
    return Hash.string(this._tag)
  }

  [Equals.sym](that: unknown): boolean {
    return isState(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

/**
 * @tsplus static effect/core/stm/STM/State/Ops isState
 */
export function isState(u: unknown): u is State<unknown, unknown> {
  return typeof u === "object" && u != null && STMStateSym in u
}

/**
 * @tsplus static effect/core/stm/STM/State.Ops done
 */
export function done<E, A>(exit: TExit<E, A>): State<E, A> {
  switch (exit._tag) {
    case "Succeed": {
      return new Done(Exit.succeed(exit.value))
    }
    case "Die": {
      return new Done(Exit.die(exit.value))
    }
    case "Fail": {
      return new Done(Exit.fail(exit.value))
    }
    case "Interrupt": {
      return new Done(Exit.interrupt(exit.fiberId))
    }
    case "Retry": {
      throw new Error("Bug: done being called on TExit.Retry")
    }
  }
}

/**
 * @tsplus static effect/core/stm/STM/State.Ops interrupted
 */
export const interrupted: State<never, never> = new Interrupted()

/**
 * @tsplus static effect/core/stm/STM/State.Ops running
 */
export const running: State<never, never> = new Running()

/**
 * @tsplus getter effect/core/stm/STM/State isRunning
 */
export function isRunning<E, A>(self: State<E, A>): self is Running {
  return self._tag === "Running"
}
