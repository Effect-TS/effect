import { Cause } from "../../Cause.js"
import { Chunk } from "../../Chunk.js"
import { Effect } from "../../Effect.js"
import { Exit } from "../../Exit.js"
import { pipe } from "../../Function.js"
import { Option } from "../../Option.js"
import type { StreamEmit } from "../../StreamEmit.js"

/** @internal */
export const make = <R, E, A, B>(
  emit: (f: Effect<R, Option<E>, Chunk<A>>) => Promise<B>
): StreamEmit<R, E, A, B> => {
  const ops: StreamEmit.EmitOps<R, E, A, B> = {
    chunk(this: StreamEmit<R, E, A, B>, as: Chunk<A>) {
      return this(Effect.succeed(as))
    },
    die<Err>(this: StreamEmit<R, E, A, B>, defect: Err) {
      return this(Effect.die(defect))
    },
    dieMessage(this: StreamEmit<R, E, A, B>, message: string) {
      return this(Effect.dieMessage(message))
    },
    done(this: StreamEmit<R, E, A, B>, exit: Exit<E, A>) {
      return this(Effect.suspend(() => Exit.mapBoth(exit, { onFailure: Option.some, onSuccess: Chunk.of })))
    },
    end(this: StreamEmit<R, E, A, B>) {
      return this(Effect.fail(Option.none()))
    },
    fail(this: StreamEmit<R, E, A, B>, e: E) {
      return this(Effect.fail(Option.some(e)))
    },
    fromEffect(this: StreamEmit<R, E, A, B>, effect: Effect<R, E, A>) {
      return this(Effect.mapBoth(effect, { onFailure: Option.some, onSuccess: Chunk.of }))
    },
    fromEffectChunk(this: StreamEmit<R, E, A, B>, effect: Effect<R, E, Chunk<A>>) {
      return this(pipe(effect, Effect.mapError(Option.some)))
    },
    halt(this: StreamEmit<R, E, A, B>, cause: Cause<E>) {
      return this(Effect.failCause(pipe(cause, Cause.map(Option.some))))
    },
    single(this: StreamEmit<R, E, A, B>, value: A) {
      return this(Effect.succeed(Chunk.of(value)))
    }
  }
  return Object.assign(emit, ops)
}
