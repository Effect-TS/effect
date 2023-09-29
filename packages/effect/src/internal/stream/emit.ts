import * as Cause from "../../Cause"
import * as Chunk from "../../Chunk"
import * as Effect from "../../Effect"
import * as Exit from "../../Exit"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import type * as Emit from "../../StreamEmit"

/** @internal */
export const make = <R, E, A, B>(
  emit: (f: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>) => Promise<B>
): Emit.Emit<R, E, A, B> => {
  const ops: Emit.EmitOps<R, E, A, B> = {
    chunk(this: Emit.Emit<R, E, A, B>, as: Chunk.Chunk<A>) {
      return this(Effect.succeed(as))
    },
    die<Err>(this: Emit.Emit<R, E, A, B>, defect: Err) {
      return this(Effect.die(defect))
    },
    dieMessage(this: Emit.Emit<R, E, A, B>, message: string) {
      return this(Effect.dieMessage(message))
    },
    done(this: Emit.Emit<R, E, A, B>, exit: Exit.Exit<E, A>) {
      return this(Effect.suspend(() => Exit.mapBoth(exit, { onFailure: Option.some, onSuccess: Chunk.of })))
    },
    end(this: Emit.Emit<R, E, A, B>) {
      return this(Effect.fail(Option.none()))
    },
    fail(this: Emit.Emit<R, E, A, B>, e: E) {
      return this(Effect.fail(Option.some(e)))
    },
    fromEffect(this: Emit.Emit<R, E, A, B>, effect: Effect.Effect<R, E, A>) {
      return this(Effect.mapBoth(effect, { onFailure: Option.some, onSuccess: Chunk.of }))
    },
    fromEffectChunk(this: Emit.Emit<R, E, A, B>, effect: Effect.Effect<R, E, Chunk.Chunk<A>>) {
      return this(pipe(effect, Effect.mapError(Option.some)))
    },
    halt(this: Emit.Emit<R, E, A, B>, cause: Cause.Cause<E>) {
      return this(Effect.failCause(pipe(cause, Cause.map(Option.some))))
    },
    single(this: Emit.Emit<R, E, A, B>, value: A) {
      return this(Effect.succeed(Chunk.of(value)))
    }
  }
  return Object.assign(emit, ops)
}
