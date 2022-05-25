// -----------------------------------------------------------------------------
// Fiber Failure
// -----------------------------------------------------------------------------

// TODO(Mike/Max): implementation
// import { pretty } from "./Pretty"

export const FiberFailureSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/FiberFailure"
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

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u[FiberFailureSymbol] === "FiberFailure"
}

// // -----------------------------------------------------------------------------
// // Untraced
// // -----------------------------------------------------------------------------

// export const UntracedSymbol: unique symbol = Symbol.for(
//   "@effect/core/Cause/errors/Untraced"
// )

// export class Untraced extends Error {
//   readonly [UntracedSymbol] = "Untraced"

//   constructor(message?: string) {
//     super(message)
//     delete this.stack
//     this.name = this[UntracedSymbol]
//   }
// }

// export const isUntraced = (u: unknown): u is Untraced =>
//   u instanceof Error && u[UntracedSymbol] === "Untraced"

// -----------------------------------------------------------------------------
// Runtime
// -----------------------------------------------------------------------------

export const RuntimeErrorSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/Runtime"
)

export class RuntimeError {
  readonly [RuntimeErrorSymbol] = "RuntimeError"

  constructor(readonly message?: string) {}
}

export function isRuntime(u: unknown): u is RuntimeError {
  return u instanceof RuntimeError && u[RuntimeErrorSymbol] === "RuntimeError"
}

// -----------------------------------------------------------------------------
// Channel
// -----------------------------------------------------------------------------

export const ChannelErrorSymbol = Symbol.for("@effect/core/Cause/errors/Channel")
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
  "@effect/core/Cause/errors/Interrupted"
)

export class InterruptedException extends Error {
  readonly [InterruptedSymbol] = "InterruptedException"

  constructor(message?: string) {
    super(message)
    this.name = this[InterruptedSymbol]
  }
}

export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof Error && u[InterruptedSymbol] === "InterruptedException"
}

// -----------------------------------------------------------------------------
// Illegal State
// -----------------------------------------------------------------------------

export const IllegalStateExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/IllegalState"
)

export class IllegalStateException extends Error {
  readonly [IllegalStateExceptionSymbol] = "IllegalStateException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalStateExceptionSymbol]
  }
}

export function isIllegalStateException(u: unknown): u is IllegalStateException {
  return u instanceof Error && u[IllegalStateExceptionSymbol] === "IllegalStateException"
}

// -----------------------------------------------------------------------------
// Illegal Argument
// -----------------------------------------------------------------------------

export const IllegalArgumentExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/IllegalArgument"
)
export class IllegalArgumentException extends Error {
  readonly [IllegalArgumentExceptionSymbol] = "IllegalArgumentException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalArgumentExceptionSymbol]
  }
}

export function isIllegalArgumentException(u: unknown): u is IllegalArgumentException {
  return u instanceof Error && u[IllegalArgumentExceptionSymbol] === "IllegalArgumentException"
}
