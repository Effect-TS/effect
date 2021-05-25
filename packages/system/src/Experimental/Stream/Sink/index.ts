// tracing: off

import "../../../Operator"

import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import type { Predicate } from "../../../Function"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import { AtomicReference } from "../../../Support/AtomicReference"
import * as C from "../Channel"

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> {
  constructor(
    readonly channel: C.Channel<
      R,
      InErr,
      Chunk.Chunk<In>,
      unknown,
      OutErr,
      Chunk.Chunk<L>,
      Z
    >
  ) {}
}

function collectLoop<Err, A>(
  state: Chunk.Chunk<A>
): C.Channel<
  unknown,
  Err,
  Chunk.Chunk<A>,
  unknown,
  Err,
  Chunk.Chunk<never>,
  Chunk.Chunk<A>
> {
  return C.readWithCause(
    (i) => collectLoop(Chunk.concat_(state, i)),
    C.halt,
    (_) => C.end(state)
  )
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(Chunk.empty()))
}

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: C.Channel<
    unknown,
    Err,
    Chunk.Chunk<A>,
    unknown,
    Err,
    Chunk.Chunk<never>,
    void
  > = C.readWithCause(
    (_) => drain,
    C.halt,
    (_) => C.unit
  )

  return new Sink(drain)
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function forEachWhile<R, ErrIn, ErrOut, In>(
  f: (_in: In) => T.Effect<R, ErrOut, boolean>
): Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  const go = (
    chunk: Chunk.Chunk<In>,
    idx: number,
    len: number,
    cont: C.Channel<
      R,
      ErrIn,
      Chunk.Chunk<In>,
      unknown,
      ErrIn | ErrOut,
      Chunk.Chunk<In>,
      void
    >
  ): C.Channel<
    R,
    ErrIn,
    Chunk.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    Chunk.Chunk<In>,
    void
  > => {
    if (idx === len) {
      return cont
    } else {
      return pipe(
        C.fromEffect(f(Chunk.unsafeGet_(chunk, idx))),
        C.chain((b) => {
          if (b) {
            return go(chunk, idx + 1, len, cont)
          } else {
            return C.write(Chunk.drop_(chunk, idx))
          }
        }),
        C.catchAll((e) => C.zipRight_(C.write(Chunk.drop_(chunk, idx)), C.fail(e)))
      )
    }
  }

  const process: C.Channel<
    R,
    ErrIn,
    Chunk.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    Chunk.Chunk<In>,
    void
  > = C.readWithCause(
    (_in) => go(_in, 0, Chunk.size(_in), process),
    (halt) => C.halt(halt),
    (_) => C.end(undefined)
  )

  return new Sink(process)
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function forEach<R, ErrIn, ErrOut, In, B>(
  f: (_in: In) => T.Effect<R, ErrOut, B>
): Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  return forEachWhile((_) => T.as_(f(_), true))
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduce<S>(z: S) {
  return (cont: Predicate<S>) =>
    <In, Err>(f: (s: S, _in: In) => S): Sink<unknown, Err, In, Err, In, S> => {
      const reduceChunkSplit =
        (z: S, chunk: Chunk.Chunk<In>) =>
        (cont: Predicate<S>) =>
        (f: (s: S, _in: In) => S) => {
          const reduce = (
            s: S,
            chunk: Chunk.Chunk<In>,
            idx: number,
            len: number
          ): Tp.Tuple<[S, Chunk.Chunk<In>]> => {
            if (idx === len) {
              return Tp.tuple(s, Chunk.empty<In>())
            } else {
              const s1 = f(s, Chunk.unsafeGet_(chunk, idx))

              if (cont(s1)) {
                return reduce(s1, chunk, idx + 1, len)
              } else {
                return Tp.tuple(s1, Chunk.drop_(chunk, idx + 1))
              }
            }
          }

          return reduce(z, chunk, 0, Chunk.size(chunk))
        }

      const reader = (
        s: S
      ): C.Channel<unknown, Err, Chunk.Chunk<In>, unknown, Err, Chunk.Chunk<In>, S> => {
        if (!cont(s)) {
          return C.end(s)
        } else {
          return C.readWith(
            (_in) => {
              const {
                tuple: [nextS, leftovers]
              } = reduceChunkSplit(s, _in)(cont)(f)

              if (!Chunk.isEmpty(leftovers)) {
                return C.as_(C.write(leftovers), nextS)
              } else {
                return reader(nextS)
              }
            },
            (err) => C.fail(err),
            (_) => C.end(s)
          )
        }
      }

      return new Sink(reader(z))
    }
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduceM<S>(z: S) {
  return (cont: Predicate<S>) =>
    <Env, In, Err>(
      f: (s: S, _in: In) => T.Effect<Env, Err, S>
    ): Sink<Env, Err, In, Err, In, S> => {
      const reduceChunkSplit =
        (z: S, chunk: Chunk.Chunk<In>) =>
        (cont: Predicate<S>) =>
        (f: (s: S, _in: In) => T.Effect<Env, Err, S>) => {
          const reduce = (
            s: S,
            chunk: Chunk.Chunk<In>,
            idx: number,
            len: number
          ): T.Effect<Env, Err, Tp.Tuple<[S, O.Option<Chunk.Chunk<In>>]>> => {
            if (idx === len) {
              return T.succeed(Tp.tuple(s, O.none))
            } else {
              return T.chain_(f(s, Chunk.unsafeGet_(chunk, idx)), (s1) => {
                if (cont(s1)) {
                  return reduce(s1, chunk, idx + 1, len)
                } else {
                  return T.succeed(Tp.tuple(s1, O.some(Chunk.drop_(chunk, idx + 1))))
                }
              })
            }
          }

          return reduce(z, chunk, 0, Chunk.size(chunk))
        }

      const reader = (
        s: S
      ): C.Channel<Env, Err, Chunk.Chunk<In>, unknown, Err, Chunk.Chunk<In>, S> => {
        if (!cont(s)) {
          return C.end(s)
        } else {
          return C.readWith(
            (_in) => {
              return pipe(
                C.fromEffect(reduceChunkSplit(s, _in)(cont)(f)),
                C.chain(({ tuple: [nextS, leftovers] }) => {
                  return O.fold_(
                    leftovers,
                    () => reader(nextS),
                    (l) => C.as_(C.write(l), nextS)
                  )
                })
              )
            },
            (err) => C.fail(err),
            (_) => C.end(s)
          )
        }
      }

      return new Sink(reader(z))
    }
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, ErrIn, ErrOut, In, Z>(
  f: (c: Chunk.Chunk<In>) => T.Effect<R, ErrOut, Z>
) {
  return forEachChunkWhile<R, ErrIn, ErrOut, In>((_) => T.as_(f(_), true))
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function forEachChunkWhile<R, ErrIn, ErrOut, In>(
  f: (_in: Chunk.Chunk<In>) => T.Effect<R, ErrOut, boolean>
): Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  const reader: C.Channel<
    R,
    ErrIn,
    Chunk.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    never,
    void
  > = C.readWith(
    (_in) =>
      C.chain_(C.fromEffect(f(_in)), (continue_) =>
        continue_ ? reader : C.end(undefined)
      ),
    (err) => C.fail(err),
    (_) => C.unit
  )

  return new Sink(reader)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1 extends In,
  OutErr,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z1> {
  return foldM_(self, (_) => fail(_), f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z, Z1>(
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr>(self: Sink<R, InErr, In, OutErr, L, Z>) => chain_(self, f)
}

export function foldM_<
  R,
  R1,
  R2,
  InErr,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  failure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => Sink<R2, InErr2, In2, OutErr3, L2, Z2>
): Sink<
  R & R1 & R2,
  InErr & InErr1 & InErr2,
  In1 & In2,
  OutErr2 | OutErr3,
  L1 | L2,
  Z1 | Z2
> {
  return new Sink(
    C.foldM_(
      C.doneCollect(self.channel),
      (_) => failure(_).channel,
      ({ tuple: [leftovers, z] }) =>
        C.suspend(() => {
          const leftoversRef = new AtomicReference(
            Chunk.filter_(
              leftovers,
              (a): a is Chunk.Chunk<L1 | L2> => !Chunk.isEmpty(a)
            )
          )
          const refReader = C.chain_(
            C.succeedWith(() => leftoversRef.getAndSet(Chunk.empty())),
            (chunk) =>
              C.writeChunk(chunk as unknown as Chunk.Chunk<Chunk.Chunk<In1 & In2>>)
          )
          const passthrough = C.identity<InErr2, Chunk.Chunk<In1 & In2>, unknown>()
          const continationSink = C.zipRight_(refReader, passthrough)[">>>"](
            success(z).channel
          )

          return C.chain_(
            C.doneCollect(continationSink),
            ({ tuple: [newLeftovers, z1] }) =>
              C.zipRight_(
                C.chain_(
                  C.succeedWith(() => leftoversRef.get),
                  (_) => C.writeChunk(_)
                ),
                C.as_(C.writeChunk(newLeftovers), z1)
              )
          )
        })
    )
  )
}

export function foldM<
  R1,
  R2,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  failure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => Sink<R2, InErr2, In2, OutErr3, L2, Z2>
) {
  return <R, InErr>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    foldM_(self, failure, success)
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E): Sink<unknown, unknown, unknown, E, never, never> {
  return new Sink(C.fail(e))
}
