/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import type * as Option from "./Option.js"

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
export interface Emit<in R, in E, in A, out B> extends EmitOps<R, E, A, B> {
  (f: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>): Promise<B>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface EmitOps<in R, in E, in A, out B> {
  /**
   * Emits a chunk containing the specified values.
   */
  chunk(chunk: Chunk.Chunk<A>): Promise<B>

  /**
   * Terminates with a cause that dies with the specified defect.
   */
  die<Err>(defect: Err): Promise<B>

  /**
   * Terminates with a cause that dies with a `Throwable` with the specified
   * message.
   */
  dieMessage(message: string): Promise<B>

  /**
   * Either emits the specified value if this `Exit` is a `Success` or else
   * terminates with the specified cause if this `Exit` is a `Failure`.
   */
  done(exit: Exit.Exit<E, A>): Promise<B>

  /**
   * Terminates with an end of stream signal.
   */
  end(): Promise<B>

  /**
   * Terminates with the specified error.
   */
  fail(error: E): Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  fromEffect(effect: Effect.Effect<R, E, A>): Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  fromEffectChunk(effect: Effect.Effect<R, E, Chunk.Chunk<A>>): Promise<B>

  /**
   * Terminates the stream with the specified cause.
   */
  halt(cause: Cause.Cause<E>): Promise<B>

  /**
   * Emits a chunk containing the specified value.
   */
  single(value: A): Promise<B>
}
