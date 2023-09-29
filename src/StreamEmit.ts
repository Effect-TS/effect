/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause"
import type * as Chunk from "./Chunk"
import type * as Effect from "./Effect"
import type * as Exit from "./Exit"
import type * as Option from "./Option"

/**
 * An `Emit<R, E, A, B>` represents an asynchronous callback that can be
 * called multiple times. The callback can be called with a value of type
 * `Effect<R, Option<E>, Chunk<A>>`, where succeeding with a `Chunk<A>`
 * indicates to emit those elements, failing with `Some<E>` indicates to
 * terminate with that error, and failing with `None` indicates to terminate
 * with an end of stream signal.
 *
 * @since 2.0.0
 * @category models
 */
export interface Emit<R, E, A, B> extends EmitOps<R, E, A, B> {
  (f: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>): Promise<B>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface EmitOps<R, E, A, B> {
  /**
   * Emits a chunk containing the specified values.
   */
  readonly chunk: (chunk: Chunk.Chunk<A>) => Promise<B>

  /**
   * Terminates with a cause that dies with the specified defect.
   */
  readonly die: <Err>(defect: Err) => Promise<B>

  /**
   * Terminates with a cause that dies with a `Throwable` with the specified
   * message.
   */
  readonly dieMessage: (message: string) => Promise<B>

  /**
   * Either emits the specified value if this `Exit` is a `Success` or else
   * terminates with the specified cause if this `Exit` is a `Failure`.
   */
  readonly done: (exit: Exit.Exit<E, A>) => Promise<B>

  /**
   * Terminates with an end of stream signal.
   */
  readonly end: () => Promise<B>

  /**
   * Terminates with the specified error.
   */
  readonly fail: (error: E) => Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffect: (effect: Effect.Effect<R, E, A>) => Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffectChunk: (effect: Effect.Effect<R, E, Chunk.Chunk<A>>) => Promise<B>

  /**
   * Terminates the stream with the specified cause.
   */
  readonly halt: (cause: Cause.Cause<E>) => Promise<B>

  /**
   * Emits a chunk containing the specified value.
   */
  readonly single: (value: A) => Promise<B>
}
