import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus type effect/core/stream/Stream/Emit
 * @category model
 * @since 1.0.0
 */
export interface Emit<R, E, A, B> extends EmitOps<R, E, A, B> {
  (f: Effect<R, Option.Option<E>, Chunk.Chunk<A>>): Promise<B>
}

/**
 * @tsplus type effect/core/stream/Stream/Emit.Ops
 * @category model
 * @since 1.0.0
 */
export interface EmitOperations {}
export const Emit: EmitOperations = {}

/**
 * @category model
 * @since 1.0.0
 */
export interface EmitOps<R, E, A, B> {
  /**
   * Emits a chunk containing the specified values.
   */
  readonly chunk: (as: Chunk.Chunk<A>) => Promise<B>

  /**
   * Terminates with a cause that dies with the specified `Throwable`.
   */
  readonly die: <Err>(err: Err) => Promise<B>

  /**
   * Terminates with a cause that dies with a `Throwable` with the specified
   * message.
   */
  readonly dieMessage: (message: string) => Promise<B>

  /**
   * Either emits the specified value if this `Exit` is a `Success` or else
   * terminates with the specified cause if this `Exit` is a `Failure`.
   */
  readonly done: (exit: Exit<E, A>) => Promise<B>

  /**
   * Terminates with an end of stream signal.
   */
  readonly end: () => Promise<B>

  /**
   * Terminates with the specified error.
   */
  readonly fail: (e: E) => Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffect: (io: Effect<R, E, A>) => Promise<B>

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffectChunk: (io: Effect<R, E, Chunk.Chunk<A>>) => Promise<B>

  /**
   * Terminates the stream with the specified cause.
   */
  readonly halt: (cause: Cause<E>) => Promise<B>

  /**
   * Emits a chunk containing the specified value.
   */
  readonly single: (a: A) => Promise<B>
}

/**
 * @tsplus static effect/core/stream/Stream/Emit.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function apply<R, E, A, B>(
  fn: (f: Effect<R, Option.Option<E>, Chunk.Chunk<A>>) => Promise<B>
): Emit<R, E, A, B> {
  const ops: EmitOps<R, E, A, B> = {
    chunk(this: Emit<R, E, A, B>, as: Chunk.Chunk<A>) {
      return this(Effect.succeed(as))
    },
    die<Err>(this: Emit<R, E, A, B>, err: Err) {
      return this(Effect.dieSync(err))
    },
    dieMessage(this: Emit<R, E, A, B>, message: string) {
      return this(Effect.dieMessage(message))
    },
    done(this: Emit<R, E, A, B>, exit: Exit<E, A>) {
      return this(Effect.done(exit.mapBoth(Option.some, Chunk.single)))
    },
    end(this: Emit<R, E, A, B>) {
      return this(Effect.fail(Option.none))
    },
    fail(this: Emit<R, E, A, B>, e: E) {
      return this(Effect.fail(Option.some(e)))
    },
    fromEffect(this: Emit<R, E, A, B>, io: Effect<R, E, A>) {
      return this(io.mapBoth(Option.some, Chunk.single))
    },
    fromEffectChunk(
      this: Emit<R, E, A, B>,
      io: Effect<R, E, Chunk.Chunk<A>>
    ) {
      return this(io.mapError(Option.some))
    },
    halt(this: Emit<R, E, A, B>, cause: Cause<E>) {
      return this(Effect.failCauseSync(cause.map(Option.some)))
    },
    single(this: Emit<R, E, A, B>, a: A) {
      return this(Effect.succeed(Chunk.single(a)))
    }
  }

  return Object.assign(fn, ops)
}
