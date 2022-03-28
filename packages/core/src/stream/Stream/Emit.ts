import { Chunk } from "../../collection/immutable/Chunk"
import { Option } from "../../data/Option"
import type { Cause } from "../../io/Cause"
import type { RIO } from "../../io/Effect"
import { Effect } from "../../io/Effect"
import type { Exit } from "../../io/Exit"

export type Canceler<R> = RIO<R, unknown>

/**
 * @tsplus type ets/Stream/Emit
 */
export interface Emit<R, E, A, B> extends EmitOps<R, E, A, B> {
  (f: Effect<R, Option<E>, Chunk<A>>): B
}

/**
 * @tsplus type ets/Stream/EmitStatic
 */
export interface EmitStatic {}
export const Emit: EmitStatic = {}

export interface EmitOps<R, E, A, B> {
  /**
   * Emits a chunk containing the specified values.
   */
  readonly chunk: (as: Chunk<A>) => B

  /**
   * Terminates with a cause that dies with the specified `Throwable`.
   */
  readonly die: <Err>(err: Err) => B

  /**
   * Terminates with a cause that dies with a `Throwable` with the specified
   * message.
   */
  readonly dieMessage: (message: string) => B

  /**
   * Either emits the specified value if this `Exit` is a `Success` or else
   * terminates with the specified cause if this `Exit` is a `Failure`.
   */
  readonly done: (exit: Exit<E, A>) => B

  /**
   * Terminates with an end of stream signal.
   */
  readonly end: () => B

  /**
   * Terminates with the specified error.
   */
  readonly fail: (e: E) => B

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffect: (io: Effect<R, E, A>) => B

  /**
   * Either emits the success value of this effect or terminates the stream
   * with the failure value of this effect.
   */
  readonly fromEffectChunk: (io: Effect<R, E, Chunk<A>>) => B

  /**
   * Terminates the stream with the specified cause.
   */
  readonly halt: (cause: Cause<E>) => B

  /**
   * Emits a chunk containing the specified value.
   */
  readonly single: (a: A) => B
}

/**
 * @tsplus static ets/Stream/EmitStatic __call
 */
export function apply<R, E, A, B>(
  fn: (f: Effect<R, Option<E>, Chunk<A>>) => B
): Emit<R, E, A, B> {
  const ops: EmitOps<R, E, A, B> = {
    chunk(this: Emit<R, E, A, B>, as: Chunk<A>, __tsplusTrace?: string) {
      return this(Effect.succeedNow(as))
    },
    die<Err>(this: Emit<R, E, A, B>, err: Err, __tsplusTrace?: string): B {
      return this(Effect.die(err))
    },
    dieMessage(this: Emit<R, E, A, B>, message: string, __tsplusTrace?: string): B {
      return this(Effect.dieMessage(message))
    },
    done(this: Emit<R, E, A, B>, exit: Exit<E, A>, __tsplusTrace?: string): B {
      return this(
        Effect.done(
          exit.mapBoth(
            (e) => Option.some(e),
            (a) => Chunk.single(a)
          )
        )
      )
    },
    end(this: Emit<R, E, A, B>, __tsplusTrace?: string): B {
      return this(Effect.fail(Option.none))
    },
    fail(this: Emit<R, E, A, B>, e: E, __tsplusTrace?: string): B {
      return this(Effect.fail(Option.some(e)))
    },
    fromEffect(this: Emit<R, E, A, B>, io: Effect<R, E, A>, __tsplusTrace?: string): B {
      return this(
        io.mapBoth(
          (e) => Option.some(e),
          (a) => Chunk.single(a)
        )
      )
    },
    fromEffectChunk(
      this: Emit<R, E, A, B>,
      io: Effect<R, E, Chunk<A>>,
      __tsplusTrace?: string
    ): B {
      return this(io.mapError((e) => Option.some(e)))
    },
    halt(this: Emit<R, E, A, B>, cause: Cause<E>, __tsplusTrace?: string): B {
      return this(Effect.failCause(cause.map((e) => Option.some(e))))
    },
    single(this: Emit<R, E, A, B>, a: A, __tsplusTrace?: string): B {
      return this(Effect.succeedNow(Chunk.single(a)))
    }
  }

  return Object.assign(fn, ops)
}
