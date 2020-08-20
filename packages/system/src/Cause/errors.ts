import type { Cause } from "./cause"
import { pretty } from "./pretty"

//
// @category FiberFailure
//

export const FiberFailureSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/FiberFailure"
)

export class FiberFailure<E> extends Error {
  readonly [FiberFailureSymbol] = "FiberFailure"

  readonly pretty = pretty(this.cause)

  constructor(readonly cause: Cause<E>) {
    super()

    this.name = this[FiberFailureSymbol]
    this.stack = undefined
  }
}

export const isFiberFailure = (u: unknown): u is FiberFailure<unknown> =>
  u instanceof Error && u[FiberFailureSymbol] === "FiberFailure"

//
// @category Untraced
//

export const UntracedSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/Untraced"
)

export class Untraced extends Error {
  readonly [UntracedSymbol] = "Untraced"

  constructor(message?: string) {
    super(message)
    this.stack = undefined
    this.name = this[UntracedSymbol]
  }
}

export const isUntraced = (u: unknown): u is Untraced =>
  u instanceof Error && u[UntracedSymbol] === "Untraced"

//
// @category Runtime
//

export const RuntimeSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/Runtime"
)

export class RuntimeError extends Error {
  readonly [RuntimeSymbol] = "RuntimeError"

  constructor(message?: string) {
    super(message)

    this.name = this[RuntimeSymbol]
  }
}

export const isRuntime = (u: unknown): u is Untraced =>
  u instanceof Error && u[RuntimeSymbol] === "RuntimeError"

//
// @category Interrupted
//

export const InterruptedSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/Interrupted"
)

export class InterruptedException extends Error {
  readonly [InterruptedSymbol] = "InterruptedException"

  constructor(message?: string) {
    super(message)
    this.name = this[InterruptedSymbol]
  }
}

export const isInterruptedException = (u: unknown): u is InterruptedException =>
  u instanceof Error && u[InterruptedSymbol] === "InterruptedException"

//
// @category IllegalState
//

export const IllegalStateSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/IllegalState"
)

export class IllegalStateException extends Error {
  readonly [IllegalStateSymbol] = "IllegalStateException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalStateSymbol]
  }
}

export const isIllegalStateException = (u: unknown): u is IllegalStateException =>
  u instanceof Error && u[IllegalStateSymbol] === "IllegalStateException"
