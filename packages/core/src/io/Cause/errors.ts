// -----------------------------------------------------------------------------
// Fiber Failure
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const FiberFailureSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/FiberFailure"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class FiberFailure<E> extends Error {
  readonly [FiberFailureSymbol] = "FiberFailure"

  constructor(readonly cause: Cause<E>) {
    super()

    this.name = this[FiberFailureSymbol]
    delete this.stack
  }

  get pretty(): string {
    return this.cause.pretty()
  }
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u[FiberFailureSymbol] === "FiberFailure"
}

// -----------------------------------------------------------------------------
// Runtime
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const RuntimeErrorSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/Runtime"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class RuntimeError {
  readonly [RuntimeErrorSymbol] = "RuntimeError"

  constructor(readonly message?: string) {}
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isRuntime(u: unknown): u is RuntimeError {
  return u instanceof RuntimeError && u[RuntimeErrorSymbol] === "RuntimeError"
}

// -----------------------------------------------------------------------------
// Channel
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const ChannelErrorSymbol = Symbol.for("@effect/core/Cause/errors/Channel")

/**
 * @category model
 * @since 1.0.0
 */
export type ChannelErrorSymbol = typeof ChannelErrorSymbol

/**
 * @category errors
 * @since 1.0.0
 */
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

/**
 * @category symbol
 * @since 1.0.0
 */
export const InterruptedSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/Interrupted"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class InterruptedException extends Error {
  readonly [InterruptedSymbol] = "InterruptedException"

  constructor(message?: string) {
    super(message)
    this.name = this[InterruptedSymbol]
  }
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof Error && u[InterruptedSymbol] === "InterruptedException"
}

// -----------------------------------------------------------------------------
// Illegal State
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const NoSuchElementExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/NoSuchElement"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class NoSuchElementException extends Error {
  readonly [NoSuchElementExceptionSymbol] = "NoSuchElementException"

  constructor(message?: string) {
    super(message)
    this.name = this[NoSuchElementExceptionSymbol]
  }
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isNoSuchElementException(u: unknown): u is NoSuchElementException {
  return u instanceof Error && u[NoSuchElementExceptionSymbol] === "NoSuchElementException"
}

// -----------------------------------------------------------------------------
// Illegal State
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const IllegalStateExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/IllegalState"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class IllegalStateException extends Error {
  readonly [IllegalStateExceptionSymbol] = "IllegalStateException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalStateExceptionSymbol]
  }
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isIllegalStateException(u: unknown): u is IllegalStateException {
  return u instanceof Error && u[IllegalStateExceptionSymbol] === "IllegalStateException"
}

// -----------------------------------------------------------------------------
// Illegal Argument
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const IllegalArgumentExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/IllegalArgument"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class IllegalArgumentException extends Error {
  readonly [IllegalArgumentExceptionSymbol] = "IllegalArgumentException"

  constructor(message?: string) {
    super(message)
    this.name = this[IllegalArgumentExceptionSymbol]
  }
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isIllegalArgumentException(u: unknown): u is IllegalArgumentException {
  return u instanceof Error && u[IllegalArgumentExceptionSymbol] === "IllegalArgumentException"
}

// -----------------------------------------------------------------------------
// Index Out Of Bounds
// -----------------------------------------------------------------------------

/**
 * @category symbol
 * @since 1.0.0
 */
export const IndexOutOfBoundsExceptionSymbol: unique symbol = Symbol.for(
  "@effect/core/Cause/errors/IndexOutOfBoundsException"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class IndexOutOfBoundsException extends Error {
  readonly [IndexOutOfBoundsExceptionSymbol] = "IndexOutOfBoundsException"

  readonly message: string = `${this.index} is out of bounds (min ${this.min}, max ${this.max})`

  constructor(readonly index: number, readonly min: number, readonly max: number) {
    super()
  }
}
