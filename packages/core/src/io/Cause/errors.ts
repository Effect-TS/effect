import type { Cause } from "./definition"

// -----------------------------------------------------------------------------
// Fiber Failure
// -----------------------------------------------------------------------------

// TODO(Mike/Max): implementation
// import { pretty } from "./Pretty"

export const FiberFailureSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/FiberFailure"
)

export class FiberFailure<E> extends Error {
  readonly [FiberFailureSymbol] = "FiberFailure"

  // readonly pretty = pretty(this.cause)

  constructor(readonly cause: Cause<E>) {
    super()

    this.name = this[FiberFailureSymbol]
    delete this.stack
  }
}

export const isFiberFailure = (u: unknown): u is FiberFailure<unknown> =>
  u instanceof Error && u[FiberFailureSymbol] === "FiberFailure"

// -----------------------------------------------------------------------------
// Untraced
// -----------------------------------------------------------------------------

export const UntracedSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/Untraced"
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

// -----------------------------------------------------------------------------
// Runtime
// -----------------------------------------------------------------------------

export const RuntimeSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/Runtime"
)

export class RuntimeError {
  readonly [RuntimeSymbol] = "RuntimeError"

  constructor(readonly message?: string) {}
}

export const isRuntime = (u: unknown): u is RuntimeError =>
  u instanceof RuntimeError && u[RuntimeSymbol] === "RuntimeError"

// -----------------------------------------------------------------------------
// Channel
// -----------------------------------------------------------------------------

export const ChannelErrorSymbol = Symbol.for("@effect-ts/core/Cause/errors/Channel")
export type ChannelErrorSymbol = typeof ChannelErrorSymbol

export class ChannelError<E> {
  readonly [ChannelErrorSymbol]: ChannelErrorSymbol = ChannelErrorSymbol
  constructor(readonly error: E) {}
}

export function isChannelError(u: unknown): u is ChannelError<unknown> {
  return typeof u === "object" && u != null && ChannelErrorSymbol in u
}

// -----------------------------------------------------------------------------
// Interrupted
// -----------------------------------------------------------------------------

export const InterruptedSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/Interrupted"
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

// -----------------------------------------------------------------------------
// Illegal State
// -----------------------------------------------------------------------------

export const IllegalStateSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/IllegalState"
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

// -----------------------------------------------------------------------------
// Illegal Argument
// -----------------------------------------------------------------------------

export const IllegalArgumentSymbol: unique symbol = Symbol.for(
  "@effect-ts/core/Cause/errors/IllegalArgument"
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
