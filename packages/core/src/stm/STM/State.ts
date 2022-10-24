import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const STMStateSymbolKey = "@effect/core/stm/STM/State"

/**
 * @category symbol
 * @since 1.0.0
 */
export const STMStateSym = Symbol.for(STMStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type STMStateSym = typeof STMStateSym

/**
 * @tsplus type effect/core/stm/STM/State
 * @category model
 * @since 1.0.0
 */
export type State<E, A> = Done<E, A> | Interrupted | Running

/**
 * @tsplus type effect/core/stm/STM/State.Ops
 * @category model
 * @since 1.0.0
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
 * @category model
 * @since 1.0.0
 */
export class Done<E, A> implements Equal.Equal {
  readonly _tag = "Done"

  readonly [STMStateSym]: STMStateSym = STMStateSym

  constructor(readonly exit: Exit<E, A>) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(STMStateSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.exit))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isState(that) &&
      that._tag === "Done" &&
      Equal.equals(this.exit, that.exit)
  }
}

/**
 * @tsplus type effect/core/stm/STM/State/Interrupted
 */
export class Interrupted implements Equal.Equal {
  readonly _tag = "Interrupted"

  readonly [STMStateSym]: STMStateSym = STMStateSym;

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(STMStateSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isState(that) && that._tag === "Interrupted"
  }
}

/**
 * @tsplus type effect/core/stm/STM/State/Running
 */
export class Running implements Equal.Equal {
  readonly _tag = "Running"

  readonly [STMStateSym]: STMStateSym = STMStateSym;

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(STMStateSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isState(that) && that._tag === "Running"
  }
}

/**
 * @tsplus static effect/core/stm/STM/State/Ops isState
 * @category refinements
 * @since 1.0.0
 */
export function isState(u: unknown): u is State<unknown, unknown> {
  return typeof u === "object" && u != null && STMStateSym in u
}

/**
 * @tsplus getter effect/core/stm/STM/State isRunning
 * @category refinements
 * @since 1.0.0
 */
export function isRunning<E, A>(self: State<E, A>): self is Running {
  return self._tag === "Running"
}

/**
 * @tsplus static effect/core/stm/STM/State.Ops done
 * @category constructors
 * @since 1.0.0
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
 * @category constructors
 * @since 1.0.0
 */
export const interrupted: State<never, never> = new Interrupted()

/**
 * @tsplus static effect/core/stm/STM/State.Ops running
 * @category constructors
 * @since 1.0.0
 */
export const running: State<never, never> = new Running()
