// ets_tracing: off

import * as CS from "../../../../../Cause/index.js"
import * as CK from "../../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../../Effect/index.js"
import * as Ex from "../../../../../Exit/index.js"
import * as O from "../../../../../Option/index.js"

export type Canceler<R> = T.RIO<R, unknown>

export interface EmitOps<R, E, A, B> {
  chunk(as: CK.Chunk<A>): B
  die<Err>(err: Err): B
  dieMessage(message: string): B
  done(exit: Ex.Exit<E, A>): B
  end(): B
  fail(e: E): B
  fromEffect(io: T.Effect<R, E, A>): B
  fromEffectChunk(io: T.Effect<R, E, CK.Chunk<A>>): B
  halt(cause: CS.Cause<E>): B
  single(a: A): B
}

export interface Emit<R, E, A, B> extends EmitOps<R, E, A, B> {
  (f: T.Effect<R, O.Option<E>, CK.Chunk<A>>): B
}

export function toEmit<R, E, A, B>(
  fn: (f: T.Effect<R, O.Option<E>, CK.Chunk<A>>) => B
): Emit<R, E, A, B> {
  const ops: EmitOps<R, E, A, B> = {
    chunk(this: Emit<R, E, A, B>, as) {
      return this(T.succeed(as))
    },
    die<Err>(this: Emit<R, E, A, B>, err: Err): B {
      return this(T.die(err))
    },
    dieMessage(this: Emit<R, E, A, B>, message: string): B {
      return this(T.dieMessage(message))
    },
    done(this: Emit<R, E, A, B>, exit: Ex.Exit<E, A>): B {
      return this(
        T.done(
          Ex.mapBoth_(
            exit,
            (e) => O.some(e),
            (a) => CK.single(a)
          )
        )
      )
    },
    end(this: Emit<R, E, A, B>): B {
      return this(T.fail(O.none))
    },
    fail(this: Emit<R, E, A, B>, e: E): B {
      return this(T.fail(O.some(e)))
    },
    fromEffect(this: Emit<R, E, A, B>, io: T.Effect<R, E, A>): B {
      return this(
        T.mapBoth_(
          io,
          (e) => O.some(e),
          (a) => CK.single(a)
        )
      )
    },
    fromEffectChunk(this: Emit<R, E, A, B>, io: T.Effect<R, E, CK.Chunk<A>>): B {
      return this(T.mapError_(io, (e) => O.some(e)))
    },
    halt(this: Emit<R, E, A, B>, cause: CS.Cause<E>): B {
      return this(T.halt(CS.map_(cause, (e) => O.some(e))))
    },
    single(this: Emit<R, E, A, B>, a: A): B {
      return this(T.succeed(CK.single(a)))
    }
  }

  return Object.assign(fn, ops)
}
