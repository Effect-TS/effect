import * as Cause from "../../Cause.js"
import * as Chunk from "../../Chunk.js"
import * as Effect from "../../Effect.js"
import * as Exit from "../../Exit.js"
import { pipe } from "../../Function.js"
import type * as Mailbox from "../../Mailbox.js"
import * as Option from "../../Option.js"
import type * as Emit from "../../StreamEmit.js"

/** @internal */
export const make = <R, E, A, B>(
  emit: (f: Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R>) => Promise<B>
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
    done(this: Emit.Emit<R, E, A, B>, exit: Exit.Exit<A, E>) {
      return this(Effect.suspend(() => Exit.mapBoth(exit, { onFailure: Option.some, onSuccess: Chunk.of })))
    },
    end(this: Emit.Emit<R, E, A, B>) {
      return this(Effect.fail(Option.none()))
    },
    fail(this: Emit.Emit<R, E, A, B>, e: E) {
      return this(Effect.fail(Option.some(e)))
    },
    fromEffect(this: Emit.Emit<R, E, A, B>, effect: Effect.Effect<A, E, R>) {
      return this(Effect.mapBoth(effect, { onFailure: Option.some, onSuccess: Chunk.of }))
    },
    fromEffectChunk(this: Emit.Emit<R, E, A, B>, effect: Effect.Effect<Chunk.Chunk<A>, E, R>) {
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

/** @internal */
export const makePush = <E, A>(mailbox: Mailbox.Mailbox<A, E>): Emit.EmitOpsPush<E, A> => {
  let finished = false
  function array(items: ReadonlyArray<A>) {
    if (finished) return false
    return Chunk.isEmpty(mailbox.unsafeOfferAll(items))
  }
  function done(exit: Exit.Exit<A, E>) {
    if (finished) return
    finished = true
    if (exit._tag === "Success") {
      mailbox.unsafeOffer(exit.value)
    }
    mailbox.unsafeDone(exit._tag === "Success" ? Exit.void : exit)
  }
  return {
    single(value: A) {
      return finished ? false : mailbox.unsafeOffer(value)
    },
    array,
    chunk(chunk) {
      return array(Chunk.toReadonlyArray(chunk))
    },
    done,
    end() {
      if (finished) return
      finished = true
      mailbox.unsafeDone(Exit.void)
    },
    halt(cause: Cause.Cause<E>) {
      return done(Exit.failCause(cause))
    },
    fail(error: E) {
      return done(Exit.fail(error))
    },
    die<Err>(defect: Err): void {
      return done(Exit.die(defect))
    },
    dieMessage(message: string): void {
      return done(Exit.die(new Error(message)))
    }
  }
}
