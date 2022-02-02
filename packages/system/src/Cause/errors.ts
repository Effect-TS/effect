// ets_tracing: off

import type { Cause } from "./cause.js"
import { pretty } from "./Pretty/index.js"

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
    delete this.stack
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
    delete this.stack
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

export class RuntimeError {
  readonly [RuntimeSymbol] = "RuntimeError"

  constructor(readonly message?: string) {}
}

export const isRuntime = (u: unknown): u is RuntimeError =>
  u instanceof RuntimeError && u[RuntimeSymbol] === "RuntimeError"

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

//
// @category IllegalState
//
export const IllegalArgumentSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/IllegalArgument"
)
export class IllegalArgumentException extends Error {
  readonly [IllegalArgumentSymbol] = "IllegalArgumentException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalArgumentSymbol]
  }
}

export const isIllegalArgumentException = (u: unknown): u is IllegalArgumentException =>
  u instanceof Error && u[IllegalArgumentSymbol] === "IllegalArgumentException"
